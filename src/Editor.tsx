/*
 * PART 1 -- the document creator.
 *
 * Deliberately fewer controls than Word. Everything here is one of the things
 * listed in the brief, and nothing here is anything else.
 *
 * Two things worth knowing about this demo:
 *
 *  - Drafts save to this browser's localStorage. In the real system a draft is
 *    a row in PostgreSQL, saved server-side.
 *  - Inline bold/italic/underline use document.execCommand, which is the only
 *    thing available without pulling in an editor framework. It is deprecated
 *    but universally supported. For production I would build the text model on
 *    Lexical or ProseMirror instead, so formatting is data rather than HTML
 *    that has to be sanitised on the way back in. Everything read out of the
 *    editable areas below IS sanitised -- see `clean()`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Page } from './document'
import { FRONT_COVER, REAR_COVER, PAGE_MM } from './template'
import { MM, PT, pageBox } from './Pages'

export type DraftDoc = {
  id: string
  name: string
  savedAt: string
  cover: Record<string, string>
  rear: Record<string, string>
  pages: Page[]
}

const LS_KEY = 'hubdemo.drafts.v1'

const BLANK_PAGE = (n: number): Page => ({
  id: `pg-${n}-${crypto.randomUUID().slice(0, 8)}`,
  size: 'A4',
  running: 'Section',
  html: '<h1>New page</h1><p>Type here. Use the controls above for headings, bold, italic, underline, alignment and spacing.</p>',
  folio: true,
  spacing: 'normal',
  textSize: 'm',
})

export const NEW_DOC = (): DraftDoc => ({
  id: `doc-${crypto.randomUUID().slice(0, 8)}`,
  name: 'Untitled document',
  savedAt: '',
  cover: {
    issuer: '‹ issuer line ›',
    title: 'New Document',
    subtitle: 'Subtitle',
    reference: 'Ref ‹ placeholder ›',
    issued: 'Issued to ‹ recipient ›',
  },
  rear: {
    closing: 'End of document.',
    note: 'Closing note.',
    footer: '‹ rear footer ›',
  },
  pages: [BLANK_PAGE(1)],
})

/* ------------------------------------------------------------------ */
/* Sanitiser. Nothing reaches the document model that is not on this list. */
/* ------------------------------------------------------------------ */

const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META'])

const ALLOWED = new Set(['H1', 'H2', 'P', 'DIV', 'BR', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM', 'U'])

export function clean(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild!

  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      if (DROP.has(child.tagName)) {
        // these carry no words worth keeping -- drop them and their contents
        child.remove()
        continue
      }
      if (!ALLOWED.has(child.tagName)) {
        // unwrap rather than delete, so the operator never loses their words
        while (child.firstChild) node.insertBefore(child.firstChild, child)
        child.remove()
        continue
      }
      const align = (child as HTMLElement).style?.textAlign
      for (const a of [...child.attributes]) child.removeAttribute(a.name)
      if (align && ['left', 'center', 'right', 'justify'].includes(align)) {
        ;(child as HTMLElement).style.textAlign = align
      }
      walk(child)
    }
  }
  walk(root)
  return root.innerHTML
}

/* ------------------------------------------------------------------ */

const exec = (cmd: string, val?: string) => {
  document.execCommand(cmd, false, val)
}

const AlignIcon = ({ lines }: { lines: number[] }) => (
  <svg viewBox="0 0 16 12" width="15" height="11" aria-hidden="true">
    {lines.map((w, i) => (
      <rect key={i} x={0} y={i * 3} width={w} height="1.4" fill="currentColor" />
    ))}
  </svg>
)

function Tool({
  label,
  title,
  onClick,
  active,
  wide,
}: {
  label: React.ReactNode
  title: string
  onClick: () => void
  active?: boolean
  wide?: boolean
}) {
  return (
    <button
      className={`tool${active ? ' on' : ''}${wide ? ' wide' : ''}`}
      title={title}
      // keep the text selection alive when the button takes focus
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

/* ------------------------------------------------------------------ */

type Sel = { kind: 'cover' } | { kind: 'rear' } | { kind: 'page'; index: number }

export default function Editor({
  doc,
  setDoc,
  onPreview,
  onExit,
}: {
  doc: DraftDoc
  /* A dispatcher, not a plain setter: the debounced read-back below has to
   * merge into the newest document, never into the one captured when the
   * timer was scheduled. That bug silently reverted page additions. */
  setDoc: React.Dispatch<React.SetStateAction<DraftDoc>>
  onPreview: () => void
  onExit: () => void
}) {
  const [sel, setSel] = useState<Sel>({ kind: 'page', index: 0 })
  const [scale, setScale] = useState(0.7)
  const [overflow, setOverflow] = useState(0)
  const [drafts, setDrafts] = useState<DraftDoc[]>([])
  const [openList, setOpenList] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const editable = useRef<HTMLDivElement>(null)

  const page = sel.kind === 'page' ? doc.pages[sel.index] : null

  const say = (m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 2600)
  }

  /* fit the page into whatever room the canvas has */
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const size = page?.size ?? 'A4'
    const box = { w: PAGE_MM[size].w * MM, h: PAGE_MM[size].h * MM }
    const measure = () => {
      const s = Math.min((el.clientWidth - 56) / box.w, (el.clientHeight - 56) / box.h)
      setScale(Math.max(0.2, Math.min(s, 1.1)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [page?.size, sel])

  /* Does the text still fit on the page? A fixed-page authoring tool that lets
   * you type past the bottom of the sheet without saying so is a trap. */
  const checkOverflow = useCallback(() => {
    const el = editable.current
    if (!el) return setOverflow(0)
    const kids = [...el.children]
    if (!kids.length) return setOverflow(0)
    const box = el.getBoundingClientRect()
    const last = kids[kids.length - 1].getBoundingClientRect()
    const s = box.height / el.offsetHeight || 1
    setOverflow(Math.round((last.bottom - box.bottom) / s))
  }, [])

  useEffect(() => {
    const t = window.setTimeout(checkOverflow, 60)
    return () => window.clearTimeout(t)
  }, [sel, doc, scale, checkOverflow])

  /* Load this page's stored text into the editable area. Keyed on the page id,
   * so switching pages loads new text but changing size or spacing does not
   * wipe what the operator is typing. */
  useEffect(() => {
    if (sel.kind !== 'page') return
    const el = editable.current
    if (!el) return
    el.innerHTML = doc.pages[sel.index]?.html ?? ''
    checkOverflow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.kind, sel.kind === 'page' ? doc.pages[sel.index]?.id : null])

  useEffect(() => {
    try {
      setDrafts(JSON.parse(localStorage.getItem(LS_KEY) || '[]'))
    } catch {
      setDrafts([])
    }
  }, [])

  /* ---------------- document operations ---------------- */

  const patchPage = (i: number, p: Partial<Page>) =>
    setDoc({ ...doc, pages: doc.pages.map((x, k) => (k === i ? { ...x, ...p } : x)) })

  const addPage = () => {
    flush()
    const at = sel.kind === 'page' ? sel.index + 1 : doc.pages.length
    const pages = [...doc.pages]
    pages.splice(at, 0, BLANK_PAGE(doc.pages.length + 1))
    setDoc({ ...doc, pages })
    setSel({ kind: 'page', index: at })
  }

  const duplicatePage = () => {
    flush()
    if (sel.kind !== 'page') return
    const src = doc.pages[sel.index]
    if (!src) return
    const copy: Page = { ...src, id: `pg-${crypto.randomUUID().slice(0, 8)}` }
    const pages = [...doc.pages]
    pages.splice(sel.index + 1, 0, copy)
    setDoc({ ...doc, pages })
    setSel({ kind: 'page', index: sel.index + 1 })
  }

  const deletePage = () => {
    flush()
    if (sel.kind !== 'page' || doc.pages.length === 1) return
    const pages = doc.pages.filter((_, k) => k !== sel.index)
    setDoc({ ...doc, pages })
    setSel({ kind: 'page', index: Math.max(0, sel.index - 1) })
  }

  const movePage = (dir: -1 | 1) => {
    flush()
    if (sel.kind !== 'page') return
    const to = sel.index + dir
    if (to < 0 || to >= doc.pages.length || !doc.pages[sel.index]) return
    const pages = [...doc.pages]
    ;[pages[sel.index], pages[to]] = [pages[to], pages[sel.index]]
    setDoc({ ...doc, pages })
    setSel({ kind: 'page', index: to })
  }

  /* ---------------- save / reopen ---------------- */

  const saveDraft = () => {
    const stamp = new Date().toISOString()
    const rec: DraftDoc = { ...currentDoc(), savedAt: stamp }
    const next = [rec, ...drafts.filter((d) => d.id !== doc.id)].slice(0, 12)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    setDrafts(next)
    setDoc(rec)
    say(`Saved "${rec.name}"`)
  }

  const openDraft = (d: DraftDoc) => {
    setDoc(d)
    setSel({ kind: 'page', index: 0 })
    setOpenList(false)
    say(`Opened "${d.name}"`)
  }

  /* ---------------- rendering ---------------- */

  /* The document as it stands right now, including text the operator has typed
   * but which has not been committed to state yet. Anything that persists or
   * hands the document on must use this, not `doc`, or it saves a stale page. */
  const currentDoc = (): DraftDoc => {
    if (sel.kind !== 'page' || !editable.current) return doc
    const html = clean(editable.current.innerHTML)
    if (html === doc.pages[sel.index]?.html) return doc
    return { ...doc, pages: doc.pages.map((x, k) => (k === sel.index ? { ...x, html } : x)) }
  }

  const readBack = () => {
    const el = editable.current
    if (sel.kind !== 'page' || !el) return
    const html = clean(el.innerHTML)
    const idx = sel.index
    setDoc((d) =>
      d.pages[idx]?.html === html
        ? d
        : { ...d, pages: d.pages.map((x, k) => (k === idx ? { ...x, html } : x)) },
    )
  }

  /* While typing: keep the overflow warning live, and commit to the model on a
   * short debounce so edits survive switching page without blurring first. */
  const commit = useRef<number | undefined>(undefined)
  const onEdit = () => {
    checkOverflow()
    window.clearTimeout(commit.current)
    commit.current = window.setTimeout(readBack, 400)
  }

  /* Commit now and cancel anything in flight. Every operation that changes
   * which pages exist, or which one is selected, must go through this -- a
   * timer that fires afterwards would write this page's text into whatever
   * page has since taken its index. */
  const flush = () => {
    window.clearTimeout(commit.current)
    readBack()
  }

  const coverTpl = sel.kind === 'rear' ? REAR_COVER : FRONT_COVER
  const coverText = sel.kind === 'rear' ? doc.rear : doc.cover

  return (
    <div className="editor">
      <header className="ed-top">
        <div className="ed-brand">
          <span className="ed-dot" />
          DOCUMENT CREATOR
        </div>
        <input
          className="ed-name"
          value={doc.name}
          onChange={(e) => setDoc({ ...doc, name: e.target.value })}
          aria-label="Document name"
        />
        <div className="ed-top-right">
          <Tool label="SAVE DRAFT" title="Save this draft" onClick={saveDraft} wide />
          <Tool label="OPEN…" title="Reopen a saved draft" onClick={() => setOpenList(!openList)} wide />
          <Tool
            label="PREVIEW"
            title="Preview in the reader"
            onClick={() => {
              flush()
              onPreview()
            }}
            wide
          />
          <Tool label="✕" title="Back to the Hub" onClick={onExit} />
        </div>
      </header>

      <div className="ed-main">
        {/* -------- page list -------- */}
        <aside className="ed-pages">
          <div className="ed-side-head">PAGES</div>
          <button
            className={`ed-thumb${sel.kind === 'cover' ? ' on' : ''}`}
            onClick={() => {
              flush()
              setSel({ kind: 'cover' })
            }}
          >
            <span className="ed-thumb-n">—</span> Front cover
          </button>
          {doc.pages.map((p, k) => (
            <button
              key={p.id}
              className={`ed-thumb${sel.kind === 'page' && sel.index === k ? ' on' : ''}`}
              onClick={() => {
                flush()
                setSel({ kind: 'page', index: k })
              }}
            >
              <span className="ed-thumb-n">{k + 1}</span>
              <span className="ed-thumb-t">{p.running || 'Untitled'}</span>
              <span className="ed-thumb-s">{p.size}</span>
            </button>
          ))}
          <button
            className={`ed-thumb${sel.kind === 'rear' ? ' on' : ''}`}
            onClick={() => {
              flush()
              setSel({ kind: 'rear' })
            }}
          >
            <span className="ed-thumb-n">—</span> Rear cover
          </button>

          <div className="ed-pageops">
            <Tool label="+ ADD" title="Add a page after this one" onClick={addPage} wide />
            <Tool label="DUPLICATE" title="Duplicate this page" onClick={duplicatePage} wide />
            <Tool label="↑" title="Move page up" onClick={() => movePage(-1)} />
            <Tool label="↓" title="Move page down" onClick={() => movePage(1)} />
            <Tool label="DELETE" title="Delete this page" onClick={deletePage} wide />
          </div>
          <p className="ed-side-note">
            Covers cannot be added, deleted or reordered — a document is always front cover, content,
            rear cover.
          </p>
        </aside>

        {/* -------- canvas -------- */}
        <section className="ed-canvas-wrap">
          <div className="ed-toolbar">
            {sel.kind === 'page' ? (
              <>
                <div className="ed-group">
                  <Tool label={<b>B</b>} title="Bold" onClick={() => { exec('bold'); readBack() }} />
                  <Tool label={<i>I</i>} title="Italic" onClick={() => { exec('italic'); readBack() }} />
                  <Tool label={<u>U</u>} title="Underline" onClick={() => { exec('underline'); readBack() }} />
                </div>
                <div className="ed-group">
                  <Tool label="H1" title="Heading" onClick={() => { exec('formatBlock', 'H1'); readBack() }} />
                  <Tool label="H2" title="Sub-heading" onClick={() => { exec('formatBlock', 'H2'); readBack() }} />
                  <Tool label="Body" title="Body text" onClick={() => { exec('formatBlock', 'P'); readBack() }} />
                  <Tool label="•" title="Bulleted list" onClick={() => { exec('insertUnorderedList'); readBack() }} />
                </div>
                <div className="ed-group">
                  <Tool
                    label={<AlignIcon lines={[16, 10, 14, 8]} />}
                    title="Align left"
                    onClick={() => { exec('justifyLeft'); readBack() }}
                  />
                  <Tool
                    label={<span className="ctr"><AlignIcon lines={[16, 10, 14, 8]} /></span>}
                    title="Align centre"
                    onClick={() => { exec('justifyCenter'); readBack() }}
                  />
                  <Tool
                    label={<span className="rgt"><AlignIcon lines={[16, 10, 14, 8]} /></span>}
                    title="Align right"
                    onClick={() => { exec('justifyRight'); readBack() }}
                  />
                  <Tool
                    label={<AlignIcon lines={[16, 16, 16, 16]} />}
                    title="Justify"
                    onClick={() => { exec('justifyFull'); readBack() }}
                  />
                </div>
                <div className="ed-group">
                  <span className="ed-lbl">Size</span>
                  {(['s', 'm', 'l'] as const).map((s) => (
                    <Tool
                      key={s}
                      label={s.toUpperCase()}
                      title={`Text size ${s.toUpperCase()}`}
                      active={(page?.textSize ?? 'm') === s}
                      onClick={() => patchPage(sel.index, { textSize: s })}
                    />
                  ))}
                </div>
                <div className="ed-group">
                  <span className="ed-lbl">Spacing</span>
                  {(['compact', 'normal', 'roomy'] as const).map((s) => (
                    <Tool
                      key={s}
                      label={s[0].toUpperCase()}
                      title={`Paragraph spacing: ${s}`}
                      active={(page?.spacing ?? 'normal') === s}
                      onClick={() => patchPage(sel.index, { spacing: s })}
                    />
                  ))}
                </div>
                <div className="ed-group">
                  <span className="ed-lbl">Page</span>
                  {(['A4', 'A5'] as const).map((s) => (
                    <Tool
                      key={s}
                      label={s}
                      title={`${s} — ${PAGE_MM[s].w} × ${PAGE_MM[s].h} mm`}
                      active={page?.size === s}
                      onClick={() => patchPage(sel.index, { size: s })}
                    />
                  ))}
                  <Tool
                    label="№"
                    title="Page numbering on this page"
                    active={page?.folio !== false}
                    onClick={() => patchPage(sel.index, { folio: page?.folio === false })}
                  />
                </div>
              </>
            ) : (
              <div className="ed-cover-hint">
                Locked artwork. Click any highlighted area to edit its text — the artwork underneath
                cannot be moved, resized or deleted.
              </div>
            )}
          </div>

          <div className="ed-canvas" ref={canvas}>
            <div style={{ width: (page ? pageBox(page.size).width : pageBox('A4').width) * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                {sel.kind === 'page' && page ? (
                  <div className="page content editing" style={pageBox(page.size)}>
                    <div className="running">
                      <input
                        className="ed-running"
                        value={page.running ?? ''}
                        onChange={(e) => patchPage(sel.index, { running: e.target.value })}
                        placeholder="Running head"
                        style={{ fontSize: 7.5 * PT }}
                      />
                      <span className="sizetag">{page.size}</span>
                    </div>
                    {/* Uncontrolled on purpose. React must not own the children of
                        a contentEditable -- if it re-renders them underneath the
                        operator it mangles their text and moves the caret. The DOM
                        is loaded once per page (see the effect above) and read back
                        out; React never writes into it again. */}
                    <div
                      ref={editable}
                      className={`body sp-${page.spacing ?? 'normal'} ts-${page.textSize ?? 'm'}`}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={onEdit}
                      onBlur={readBack}
                    />
                    {page.folio !== false && (
                      <div className="folio">
                        <span>{doc.name}</span>
                        <span>
                          {sel.index + 1} / {doc.pages.length}
                        </span>
                      </div>
                    )}
                    {overflow > 0 && (
                      <div className="ed-overflow-line" style={{ top: `calc(297mm - 20mm)` }} />
                    )}
                  </div>
                ) : (
                  <EditableCover
                    tpl={coverTpl}
                    text={coverText}
                    which={sel.kind === 'rear' ? 'rear' : 'front'}
                    onChange={(id, v) =>
                      sel.kind === 'rear'
                        ? setDoc({ ...doc, rear: { ...doc.rear, [id]: v } })
                        : setDoc({ ...doc, cover: { ...doc.cover, [id]: v } })
                    }
                  />
                )}
              </div>
            </div>
          </div>

          <div className="ed-status">
            {sel.kind === 'page' ? (
              overflow > 0 ? (
                <span className="warn">
                  ⚠ Text runs {Math.round(overflow / MM)} mm past the bottom of the page. Split it, or
                  reduce size or spacing.
                </span>
              ) : (
                <span>
                  Fits the page. {page?.size} — {PAGE_MM[page?.size ?? 'A4'].w} ×{' '}
                  {PAGE_MM[page?.size ?? 'A4'].h} mm. Draft saves to this browser only.
                </span>
              )
            ) : (
              <span>
                {coverTpl.regions.length} editable areas on this cover. Artwork is a locked layer.
              </span>
            )}
          </div>
        </section>
      </div>

      {openList && (
        <>
          <div className="scrim" onClick={() => setOpenList(false)} />
          <div className="ed-open" role="dialog" aria-label="Saved drafts">
            <div className="drawer-head">
              SAVED DRAFTS
              <button className="btn ghost" onClick={() => setOpenList(false)}>
                ✕
              </button>
            </div>
            {drafts.length === 0 && <p className="ed-empty">No saved drafts in this browser yet.</p>}
            {drafts.map((d) => (
              <button key={d.id + d.savedAt} className="toc-item" onClick={() => openDraft(d)}>
                <span className="toc-n">{d.pages.length}p</span>
                <span>
                  {d.name}
                  <small>{d.savedAt ? new Date(d.savedAt).toLocaleString() : ''}</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {toast && <div className="ed-toast">{toast}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cover editing: text regions are editable, artwork is not reachable.   */
/* ------------------------------------------------------------------ */

function EditableCover({
  tpl,
  text,
  which,
  onChange,
}: {
  tpl: typeof FRONT_COVER
  text: Record<string, string>
  which: 'front' | 'rear'
  onChange: (id: string, v: string) => void
}) {
  return (
    <div className="page cover editing" style={pageBox(tpl.size)}>
      <div className="locked" aria-hidden="true">
        {tpl.artwork(`ed-${which}`)}
      </div>
      {tpl.regions.map((r) => (
        <div
          key={r.id}
          className="region editable-region"
          data-label={r.label}
          style={{
            left: r.x * MM,
            top: r.y * MM,
            width: r.w * MM,
            minHeight: r.h * MM,
            textAlign: r.align ?? 'left',
            fontSize: (r.size ?? 10) * PT,
            fontWeight: r.weight ?? 400,
            letterSpacing: `${r.tracking ?? 0}em`,
            color: r.color ?? '#fff',
            textTransform: r.transform ?? 'none',
            lineHeight: r.lineHeight ?? 1.3,
            fontFamily: r.serif ? "'Source Serif 4', Georgia, serif" : undefined,
          }}
        >
          <textarea
            value={text[r.id] ?? ''}
            onChange={(e) => onChange(r.id, e.target.value)}
            aria-label={r.label}
            spellCheck={false}
          />
        </div>
      ))}
      <div className="placeholder-stamp">placeholder artwork</div>
    </div>
  )
}
