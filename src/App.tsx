import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PAGES } from './document'
import { ContentPage, FrontCover, RearCover, pageBox } from './Pages'
import './styles.css'

const N = PAGES.length
const FRONT = -1
const REAR = N

/* Synthetic atmosphere entries (PART 5).
 * These are generated here, in the browser, from a fixed shape list. They are
 * never fetched, never derived from real documents, and carry no real data --
 * there is no path by which one recipient's information could appear here. */
const ATMOSPHERE = [
  { ref: '7421', state: 'AWAITING COLLECTION' },
  { ref: '9158', state: 'COLLECTED' },
  { ref: '3084', state: 'AWAITING COLLECTION' },
  { ref: '6602', state: 'IN PREPARATION' },
  { ref: '2317', state: 'COLLECTED' },
  { ref: '8890', state: 'AWAITING COLLECTION' },
]

function titleOf(i: number): string {
  const b = PAGES[i].blocks.find((x) => x.t === 'h1')
  return b && b.t === 'h1' ? b.s : PAGES[i].running ?? `Page ${i + 1}`
}

/* ------------------------------------------------------------------ */
/* HUB                                                                  */
/* ------------------------------------------------------------------ */

function Hub({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="hub">
      <div className="hub-grain" aria-hidden="true" />
      <header className="hub-head">
        <div className="mark" aria-hidden="true">
          <span className="mark-ring" />
        </div>
        <div>
          <div className="hub-title">‹ brand ›™ DOCUMENT HUB</div>
          <div className="hub-sub">‹ issuer name — placeholder › — Confidential Document Station</div>
        </div>
      </header>

      <main className="hub-main">
        <section className="waiting">
          <div className="waiting-label">Document waiting for you</div>
          <h1 className="waiting-title">
            Secure Document Hub &amp; Reader
            <span>Technical architecture proposal</span>
          </h1>
          <dl className="waiting-meta">
            <div>
              <dt>Reference</dt>
              <dd>‹ placeholder ›</dd>
            </div>
            <div>
              <dt>Pages</dt>
              <dd>{N + 2}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>A4 — 210 × 297 mm</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>Recipient-specific link</dd>
            </div>
          </dl>
          <button className="open-btn" onClick={onOpen}>
            OPEN DOCUMENT
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
          <p className="waiting-foot">
            Opens in this browser. Nothing to install. This is a demonstration build — the link, the
            branding and the artwork are placeholders.
          </p>
        </section>

        <aside className="station">
          <div className="station-head">Station activity</div>
          <ul>
            {ATMOSPHERE.map((a) => (
              <li key={a.ref}>
                <span className="dot" data-state={a.state} />
                <span className="ref">DOCUMENT ••••{a.ref}</span>
                <span className="state">{a.state}</span>
              </li>
            ))}
          </ul>
          <p className="station-foot">
            Interface indicators only. Synthetic, non-sensitive, generated locally — never another
            recipient's information.
          </p>
        </aside>
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* READER                                                               */
/* ------------------------------------------------------------------ */

type Fit = 'page' | 'width'

function Reader({ onExit }: { onExit: () => void }) {
  const [i, setI] = useState<number>(FRONT)
  const [contents, setContents] = useState(false)
  const [fit, setFit] = useState<Fit>('page')
  const stage = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const size = i >= 0 && i < N ? PAGES[i].size : 'A4'
  const box = pageBox(size)

  /* Scale the whole page box. Layout never reflows -- an A4 page is always an
   * A4 page, just smaller. */
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => {
      const padX = window.innerWidth < 700 ? 16 : 48
      const padY = window.innerWidth < 700 ? 16 : 40
      const availW = el.clientWidth - padX
      const availH = el.clientHeight - padY
      const byW = availW / box.width
      const byH = availH / box.height
      const s = fit === 'width' ? byW : Math.min(byW, byH)
      setScale(Math.max(0.15, Math.min(s, 1.6)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [fit, box.width, box.height])

  const go = useCallback((next: number) => {
    setI(Math.max(FRONT, Math.min(REAR, next)))
    setContents(false)
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: 0 }))
  }, [])

  /* Keyboard -- a convenience on top of the visible buttons, never the only way */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(i + 1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(i - 1)
      else if (e.key === 'Home') go(FRONT)
      else if (e.key === 'End') go(REAR)
      else if (e.key === 'Escape') setContents(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i, go])

  /* Touch swipe -- likewise a convenience */
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? i + 1 : i - 1)
    touch.current = null
  }

  const label =
    i === FRONT ? 'FRONT COVER' : i === REAR ? 'REAR COVER' : `PAGE ${i + 1} OF ${N}`

  const atEnd = i === REAR

  return (
    <div className="reader">
      {/* The bar is a band in a fixed-height flex column, not an overlay. It
          cannot scroll away, and it never covers the page. */}
      <nav className="bar" aria-label="Document navigation">
        <div className="bar-left">
          <button className="btn ghost" onClick={() => go(FRONT)} disabled={i === FRONT}>
            <span className="ico">⌂</span>
            <span className="txt">COVER</span>
          </button>
        </div>

        <div className="bar-mid">
          <button className="btn" onClick={() => go(i - 1)} disabled={i === FRONT}>
            <span className="ico">←</span>
            <span className="txt">BACK</span>
          </button>
          <div className="pos" aria-live="polite">
            {label}
          </div>
          <button className="btn" onClick={() => go(i + 1)} disabled={i === REAR}>
            <span className="txt">NEXT</span>
            <span className="ico">→</span>
          </button>
        </div>

        <div className="bar-right">
          <button
            className="btn ghost fitbtn"
            onClick={() => setFit(fit === 'page' ? 'width' : 'page')}
            title="Fit whole page / fit to width"
          >
            <span className="ico">{fit === 'page' ? '⤢' : '⤡'}</span>
            <span className="txt">{fit === 'page' ? 'FIT PAGE' : 'FIT WIDTH'}</span>
          </button>
          <button className="btn ghost" onClick={() => setContents((c) => !c)} aria-expanded={contents}>
            <span className="ico">☰</span>
            <span className="txt">CONTENTS</span>
          </button>
          <button className="btn ghost" onClick={() => window.print()}>
            <span className="ico">🖨</span>
            <span className="txt">PRINT / PDF</span>
          </button>
          <button className="btn ghost exit" onClick={onExit}>
            <span className="ico">✕</span>
            <span className="txt">EXIT</span>
          </button>
        </div>
      </nav>

      <div className="stage" ref={scroller} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="scaler"
          ref={stage}
          style={{
            width: box.width * scale,
            height: box.height * scale,
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {i === FRONT ? (
              <FrontCover />
            ) : i === REAR ? (
              <RearCover />
            ) : (
              <ContentPage page={PAGES[i]} n={i + 1} total={N} />
            )}
          </div>
        </div>
      </div>

      {/* Closing screen: simplified controls, in their own band so they are
          on screen without scrolling (PART 8). */}
      {atEnd && (
        <div className="endbar">
          <button className="btn" onClick={() => go(i - 1)}>
            ← PREVIOUS
          </button>
          <button className="btn" onClick={() => go(FRONT)}>
            ⌂ FRONT COVER
          </button>
          <button className="btn" onClick={() => window.print()}>
            🖨 PRINT / SAVE PDF
          </button>
        </div>
      )}

      {contents && (
        <>
          <div className="scrim" onClick={() => setContents(false)} />
          <div className="drawer" role="dialog" aria-label="Contents">
            <div className="drawer-head">
              CONTENTS
              <button className="btn ghost" onClick={() => setContents(false)}>
                ✕
              </button>
            </div>
            <button className="toc-item" data-active={i === FRONT} onClick={() => go(FRONT)}>
              <span className="toc-n">—</span>
              <span>Front cover</span>
            </button>
            {PAGES.map((_, k) => (
              <button key={k} className="toc-item" data-active={i === k} onClick={() => go(k)}>
                <span className="toc-n">{k + 1}</span>
                <span>{titleOf(k)}</span>
              </button>
            ))}
            <button className="toc-item" data-active={i === REAR} onClick={() => go(REAR)}>
              <span className="toc-n">—</span>
              <span>Rear cover</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function App() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="screen">{open ? <Reader onExit={() => setOpen(false)} /> : <Hub onOpen={() => setOpen(true)} />}</div>

      {/* Print output: the complete document, every page, at true A4.
          This is the browser-side equivalent of the server-side pipeline
          described on page 4 of the document. */}
      <div className="print-root" aria-hidden="true">
        <FrontCover />
        {PAGES.map((p, k) => (
          <ContentPage key={p.id} page={p} n={k + 1} total={N} />
        ))}
        <RearCover />
      </div>
    </>
  )
}
