/*
 * Template definitions.
 *
 * The point of this file is the separation the brief asks for in PART 2:
 *
 *   - `Artwork` is a locked layer. It is never edited by the operator and it is
 *     never regenerated because wording changed.
 *   - `regions` are the editable text areas, defined independently, positioned
 *     in millimetres against the true page box.
 *
 * In the production system the artwork layer is a supplied asset (SVG or a PDF
 * page) and this file is a database row, not code -- adding a template is
 * adding a definition, not rebuilding the application. The SVG below is a
 * PLACEHOLDER standing in for artwork that has not been supplied yet.
 */

export type PageSize = 'A4' | 'A5'

export const PAGE_MM: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
}

export type Region = {
  id: string
  label: string
  x: number // mm from left of page box
  y: number // mm from top of page box
  w: number
  h: number
  align?: 'left' | 'center' | 'right'
  size?: number // pt
  weight?: number
  tracking?: number // em
  color?: string
  transform?: 'uppercase' | 'none'
  serif?: boolean
  lineHeight?: number
}

export type CoverTemplate = {
  id: string
  name: string
  size: PageSize
  artwork: (id: string) => React.ReactNode
  regions: Region[]
}

/* ------------------------------------------------------------------ */
/* PLACEHOLDER ARTWORK -- front cover                                   */
/* ------------------------------------------------------------------ */

const FrontArtwork = (uid: string) => (
  <svg viewBox="0 0 210 297" preserveAspectRatio="none" className="artwork">
    <defs>
      <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#0d1114" />
        <stop offset="55%" stopColor="#11181c" />
        <stop offset="100%" stopColor="#070a0c" />
      </linearGradient>
      <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.42" r="0.5">
        <stop offset="0%" stopColor="#1d6b57" stopOpacity="0.85" />
        <stop offset="45%" stopColor="#12414f" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#0a0d10" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#5fe0b0" />
        <stop offset="50%" stopColor="#2f8fd0" />
        <stop offset="100%" stopColor="#12313f" />
      </linearGradient>
    </defs>

    <rect width="210" height="297" fill={`url(#${uid}-bg)`} />
    <rect x="0" y="70" width="210" height="150" fill={`url(#${uid}-glow)`} />

    {/* placeholder "sphere" device -- stands in for supplied brand artwork */}
    <circle cx="105" cy="132" r="46" fill="none" stroke={`url(#${uid}-rim)`} strokeWidth="0.5" />
    <circle cx="105" cy="132" r="46" fill="#0b1013" opacity="0.55" />
    <ellipse cx="105" cy="132" rx="46" ry="15" fill="none" stroke="#2f8fd0" strokeWidth="0.22" opacity="0.5" />
    <ellipse cx="105" cy="132" rx="46" ry="31" fill="none" stroke="#2f8fd0" strokeWidth="0.22" opacity="0.32" />
    <ellipse cx="105" cy="132" rx="15" ry="46" fill="none" stroke="#5fe0b0" strokeWidth="0.22" opacity="0.35" />
    <ellipse cx="105" cy="132" rx="31" ry="46" fill="none" stroke="#5fe0b0" strokeWidth="0.22" opacity="0.22" />
    <circle cx="105" cy="132" r="46" fill="none" stroke="#000" strokeWidth="0.9" opacity="0.35" />

    {/* rules and footer furniture */}
    <rect x="22" y="196" width="166" height="0.35" fill="#3f5a63" opacity="0.7" />
    <rect x="22" y="41" width="34" height="0.6" fill="#5fe0b0" opacity="0.8" />
    <rect x="0" y="286" width="210" height="0.3" fill="#243238" />
  </svg>
)

const RearArtwork = (uid: string) => (
  <svg viewBox="0 0 210 297" preserveAspectRatio="none" className="artwork">
    <defs>
      <linearGradient id={`${uid}-rbg`} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="#070a0c" />
        <stop offset="60%" stopColor="#0f1519" />
        <stop offset="100%" stopColor="#060809" />
      </linearGradient>
      <radialGradient id={`${uid}-rglow`} cx="0.5" cy="0.8" r="0.6">
        <stop offset="0%" stopColor="#123f4e" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#060809" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="210" height="297" fill={`url(#${uid}-rbg)`} />
    <rect x="0" y="120" width="210" height="177" fill={`url(#${uid}-rglow)`} />
    <circle cx="105" cy="238" r="26" fill="none" stroke="#2f8fd0" strokeWidth="0.3" opacity="0.55" />
    <circle cx="105" cy="238" r="18" fill="none" stroke="#5fe0b0" strokeWidth="0.3" opacity="0.4" />
    <rect x="22" y="60" width="166" height="0.35" fill="#3f5a63" opacity="0.6" />
    <rect x="22" y="196" width="166" height="0.35" fill="#3f5a63" opacity="0.4" />
  </svg>
)

/* ------------------------------------------------------------------ */

export const FRONT_COVER: CoverTemplate = {
  id: 'cover-front-a4',
  name: 'Front cover (A4)',
  size: 'A4',
  artwork: FrontArtwork,
  regions: [
    {
      id: 'issuer',
      label: 'Issuer line',
      x: 22, y: 30, w: 166, h: 8,
      size: 8, tracking: 0.32, transform: 'uppercase', color: '#9fb6bd', weight: 500,
    },
    {
      id: 'title',
      label: 'Document title',
      x: 22, y: 202, w: 166, h: 30,
      size: 27, weight: 300, color: '#f2f7f8', lineHeight: 1.16, serif: true,
    },
    {
      id: 'subtitle',
      label: 'Document subtitle',
      x: 22, y: 236, w: 166, h: 14,
      size: 10.5, weight: 400, color: '#8fb9c4', lineHeight: 1.4,
    },
    {
      id: 'reference',
      label: 'Reference / classification',
      x: 22, y: 272, w: 110, h: 8,
      size: 7.5, tracking: 0.22, transform: 'uppercase', color: '#6d858d',
    },
    {
      id: 'issued',
      label: 'Issued to',
      x: 132, y: 272, w: 56, h: 8,
      size: 7.5, tracking: 0.22, transform: 'uppercase', color: '#6d858d', align: 'right',
    },
  ],
}

export const REAR_COVER: CoverTemplate = {
  id: 'cover-rear-a4',
  name: 'Rear cover (A4)',
  size: 'A4',
  artwork: RearArtwork,
  regions: [
    {
      id: 'closing',
      label: 'Closing line',
      x: 22, y: 74, w: 166, h: 20,
      size: 16, weight: 300, color: '#e6eef0', lineHeight: 1.3, serif: true,
    },
    {
      id: 'note',
      label: 'Closing note',
      x: 22, y: 104, w: 166, h: 40,
      size: 9.5, weight: 400, color: '#89a6ae', lineHeight: 1.55,
    },
    {
      id: 'footer',
      label: 'Rear footer',
      x: 22, y: 276, w: 166, h: 8,
      size: 7.5, tracking: 0.22, transform: 'uppercase', color: '#5f767d', align: 'center',
    },
  ],
}
