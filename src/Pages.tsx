import type { Block, Page } from './document'
import { COVER_TEXT, REAR_TEXT } from './document'
import { FRONT_COVER, REAR_COVER, PAGE_MM, type CoverTemplate, type Region } from './template'

/* 96 dpi: the browser's own millimetre. Every page is laid out at these exact
 * pixel dimensions and then scaled as a whole, so the layout is identical at
 * every screen size -- pages scale proportionately rather than reflowing. */
export const MM = 96 / 25.4
export const PT = 96 / 72

export const pageBox = (size: 'A4' | 'A5') => {
  /* Fall back rather than throw: a malformed page should render wrong, not
   * take the whole editor down with it. */
  const mm = PAGE_MM[size] ?? PAGE_MM.A4
  return { width: mm.w * MM, height: mm.h * MM }
}

/* ---------------- covers ---------------- */

function RegionText({ r, value }: { r: Region; value: string }) {
  return (
    <div
      className="region"
      data-region={r.id}
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
      {value.split('\n').map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  )
}

export function Cover({
  tpl,
  text,
  which,
}: {
  tpl: CoverTemplate
  text: Record<string, string>
  which: 'front' | 'rear'
}) {
  return (
    <div className="page cover" style={pageBox(tpl.size)}>
      {/* locked layer -- the operator can never select, move or delete this */}
      <div className="locked" aria-hidden="true">
        {tpl.artwork(`${which}`)}
      </div>
      {/* independently defined editable regions */}
      {tpl.regions.map((r) => (
        <RegionText key={r.id} r={r} value={text[r.id] ?? ''} />
      ))}
      <div className="placeholder-stamp">placeholder artwork</div>
    </div>
  )
}

export const FrontCover = () => <Cover tpl={FRONT_COVER} text={COVER_TEXT} which="front" />
export const RearCover = () => <Cover tpl={REAR_COVER} text={REAR_TEXT} which="rear" />

/* ---------------- content pages ---------------- */

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'h1':
      return <h1>{b.s}</h1>
    case 'h2':
      return <h2>{b.s}</h2>
    case 'p':
      return <p>{b.s}</p>
    case 'ul':
      return (
        <ul>
          {b.items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol>
          {b.items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )
    case 'note':
      return <div className="note">{b.s}</div>
    case 'rule':
      return <div className="hr" />
    case 'kv':
      return (
        <dl className="kv">
          {b.rows.map(([k, v], i) => (
            <div key={i}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )
  }
}

/* A page is rendered from structure (`blocks`, as the proposal document is) or
 * from the authoring interface's rich text (`html`). Both land in the same
 * text box, at the same millimetre geometry, so the reader and the PDF do not
 * care which produced it. */
export function ContentPage({
  page,
  n,
  total,
  footer = 'Secure Document Hub & Reader — proposal',
}: {
  page: Page
  n: number
  total: number
  footer?: string
}) {
  const showFolio = page.folio !== false
  return (
    <div className="page content" style={pageBox(page.size)}>
      <div className="running">
        <span>{page.running}</span>
        <span className="sizetag">{page.size}</span>
      </div>
      <div className={`body sp-${page.spacing ?? 'normal'} ts-${page.textSize ?? 'm'}`}>
        {page.html !== undefined ? (
          <div dangerouslySetInnerHTML={{ __html: page.html }} />
        ) : (
          page.blocks?.map((b, i) => <BlockView key={i} b={b} />)
        )}
      </div>
      {showFolio && (
        <div className="folio">
          <span>{footer}</span>
          <span>
            {n} / {total}
          </span>
        </div>
      )}
    </div>
  )
}
