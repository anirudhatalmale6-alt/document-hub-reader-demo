/*
 * The demo document.
 *
 * In production this is a row set in PostgreSQL (documents -> pages -> blocks),
 * written by the authoring interface described in PART 1. Here it is a literal
 * so the reader has something real and multi-page to display.
 *
 * The content is my own technical proposal. Nothing in this file states a fact
 * about Closed Circles Ltd -- every cover string is a placeholder written by me
 * and marked as such.
 */

export type Block =
  | { t: 'h1'; s: string }
  | { t: 'h2'; s: string }
  | { t: 'p'; s: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'note'; s: string }
  | { t: 'rule' }
  | { t: 'kv'; rows: [string, string][] }

export type Page = {
  id: string
  size: 'A4' | 'A5'
  running?: string // running head
  blocks: Block[]
}

export const COVER_TEXT: Record<string, string> = {
  issuer: '‹ issuer line — placeholder ›',
  title: 'Secure Document Hub\n& Reader',
  subtitle: 'Technical architecture proposal and working demonstration\nPrepared by Anirudha Talmale',
  reference: 'Ref ‹ placeholder ›  ·  Draft for discussion',
  issued: 'Issued to ‹ recipient ›',
}

export const REAR_TEXT: Record<string, string> = {
  closing: 'End of document.',
  note:
    'This rear cover is the branded closing artwork described in PART 8 of your plan. Pressing NEXT on the last content page brings the reader here rather than simply stopping at the bottom of the final page.\n\nThe artwork on both covers is placeholder work of mine, standing in for the sample you said you would supply.',
  footer: '‹ rear footer — placeholder ›',
}

export const PAGES: Page[] = [
  {
    id: 'p1',
    size: 'A4',
    running: 'Scope',
    blocks: [
      { t: 'h1', s: 'What this document is' },
      {
        t: 'p',
        s: 'You asked applicants not to answer merely "yes, I can do this", and to set out how the system would actually be built. This document is that answer.',
      },
      {
        t: 'p',
        s: 'It is also the demonstration. You are reading it inside the document reader described in PART 6, running in an ordinary browser with nothing installed. The same document is available as a print-ready A4 PDF from the PRINT / PDF control in the navigation bar. Those two things are generated from one page model, which is the single most important architectural decision in this proposal and the one I want to justify first.',
      },
      { t: 'rule' },
      { t: 'h2', s: 'A note on what is placeholder' },
      {
        t: 'p',
        s: 'I have none of your artwork, wording or corporate detail. Everything on the covers of this document, and every bracketed string in the Hub behind it, is a deliberate placeholder written by me. I have not invented a Closed Circles Ltd address, registration number, document reference or contract clause and presented it as though it were yours. When your sample cover arrives it drops into the template layer without any of the reader or the PDF pipeline changing.',
      },
      { t: 'rule' },
      { t: 'h2', s: 'The five deliverables' },
      {
        t: 'ol',
        items: [
          'The authoring interface — deliberately smaller than Word (PART 1).',
          'Locked corporate templates with independently editable text regions (PART 2).',
          'Print-ready PDF export at true A4 and A5 (PART 3).',
          'The branded Hub and recipient-specific access (PARTS 4, 5, 10, 11).',
          'The document reader with permanent navigation (PARTS 6 to 9).',
        ],
      },
      {
        t: 'note',
        s: 'You suggested quoting these as separate milestones so you can inspect each stage before releasing payment for the next. I agree, and that is how I work anyway.',
      },
    ],
  },

  {
    id: 'p2',
    size: 'A4',
    running: 'Architecture',
    blocks: [
      { t: 'h1', s: 'Recommended architecture' },
      {
        t: 'kv',
        rows: [
          ['Front end', 'React + TypeScript, built with Vite. No component library — the reader and Hub are bespoke.'],
          ['Server', 'Node + Fastify, TypeScript throughout. Same language both sides, one set of types for the document model.'],
          ['Database', 'PostgreSQL. Migrations and seed scripts committed to the repo, run by one command.'],
          ['Object storage', 'S3-compatible (AWS S3, or Backblaze B2 / Cloudflare R2 at lower cost). Artwork, generated PDFs, uploads.'],
          ['PDF', 'Server-side render of the document model at true page geometry. Detail on the next page.'],
          ['Hosting', 'Containers on a modern PaaS — Fly.io, Render or Railway — with a managed Postgres. Detail later in this document.'],
          ['CI/CD', 'GitHub Actions: typecheck, lint, unit tests, end-to-end tests, then deploy on green.'],
        ],
      },
      { t: 'rule' },
      { t: 'h2', s: 'Why not Next.js' },
      {
        t: 'p',
        s: 'Your brief mentions Next.js as acceptable. I would not use it here, and I would rather explain than quietly comply. Next.js earns its keep on content sites that need server rendering and SEO. This system is the opposite: every page behind the link is private, must never be indexed, and the reader is a long-lived client-side application holding a document in memory. Next.js would add a rendering model you do not need and a deployment coupling you would rather not inherit at handover. A plain React bundle served by the same Fastify process is smaller, faster to hand over, and easier for you to run yourself afterwards — which you listed as a success criterion.',
      },
      {
        t: 'p',
        s: 'If you would prefer Next.js for reasons on your side, say so and I will build it that way. It is a defensible choice, just not my first one.',
      },
    ],
  },

  {
    id: 'p3',
    size: 'A4',
    running: 'Templates',
    blocks: [
      { t: 'h1', s: 'The editable template system' },
      {
        t: 'p',
        s: 'This is PART 2, and it is where most systems of this kind go wrong. The usual mistake is to treat a cover as one flat image that gets re-exported every time a word changes, which is exactly what you said must not happen.',
      },
      { t: 'h2', s: 'Two layers, never mixed' },
      {
        t: 'p',
        s: 'A template is a locked artwork layer plus a set of named text regions. The artwork is a supplied asset — SVG for line and gradient work, or an embedded PDF page if your designer works in InDesign or Illustrator. It is stored once, referenced by every document using that template, and never rewritten by the application.',
      },
      {
        t: 'p',
        s: 'Each editable area is a region record: an identifier, a label the operator sees, a position and size in millimetres against the true page box, and its typographic treatment. The operator edits the text inside a region. They cannot drag it, resize it, delete it, or touch the artwork, because the interface never offers those operations on the locked layer — the restriction is structural, not a warning dialog they can click past.',
      },
      {
        t: 'note',
        s: 'The front cover you are looking at has five regions: issuer line, title, subtitle, reference, and issued-to. Each is filled with a placeholder string. Change any of them and the artwork underneath is untouched.',
      },
      { t: 'h2', s: 'Adding templates without rebuilding' },
      {
        t: 'p',
        s: 'A template is a database row plus an artwork asset, not a code path. Adding Developer Agreements, NDAs, IP Agreements, Investor Documents, Technical Reports, Manuals or Corporate Correspondence means adding definitions. The application does not learn about each one individually, which is the architectural requirement you set at the end of PART 2.',
      },
      {
        t: 'p',
        s: 'Millimetres are used throughout rather than pixels or points, for one reason: the same numbers have to mean the same thing in the browser and on paper. A region at x=22mm sits 22mm from the trimmed edge in both.',
      },
    ],
  },

  {
    id: 'p4',
    size: 'A4',
    running: 'PDF',
    blocks: [
      { t: 'h1', s: 'Print-ready PDF' },
      {
        t: 'p',
        s: 'You were explicit that the PDF is not a secondary feature, and that the reader must never become the only way to hold the document. I treat that as a hard constraint: the PDF is the artifact, the reader is a presentation of it.',
      },
      { t: 'h2', s: 'One page model, two renderers' },
      {
        t: 'p',
        s: 'The document is stored as structure — pages, blocks, regions, template reference — not as HTML and not as a PDF. Two renderers consume that structure: the browser reader, and the server-side PDF writer. Because both read the same model, they cannot drift apart. The failure mode I am designing out is the one where a fix to the on-screen view silently stops matching what recipients print.',
      },
      { t: 'h2', s: 'How the PDF is actually produced' },
      {
        t: 'p',
        s: 'Server-side, headless Chromium prints the page model at an explicitly declared 210 × 297 mm (or 148 × 210 mm) box with print CSS. That output is vector: type stays live text, selectable and searchable, not a rasterised screenshot. The result is then post-processed with pdf-lib to set document metadata, and — where your printer requires it — to add bleed and crop geometry.',
      },
      {
        t: 'p',
        s: 'I want to be precise about a limit rather than oversell this. Browser-based PDF output is RGB. If a commercial printer demands CMYK separations with a specific ICC profile, that is a post-processing step through Ghostscript, and the colour will shift on conversion the way it always does. For emailing, desk printing and professional digital print it is entirely suitable. If you know you are going to litho-print these, tell me now and I will build the pipeline differently from the start.',
      },
      { t: 'h2', s: 'Verification, not assertion' },
      {
        t: 'p',
        s: 'Every generated PDF is checked automatically before it is stored: page count, page box in points (595.28 × 841.89 for A4), embedded fonts present, and text extractable. A PDF that fails those checks never reaches the Hub. I would rather the system refuse than hand a recipient something subtly wrong.',
      },
    ],
  },

  {
    id: 'p5',
    size: 'A4',
    running: 'Reader',
    blocks: [
      { t: 'h1', s: 'The reader and its navigation' },
      {
        t: 'p',
        s: 'PART 6 is the part of the commission you flagged as most important, so it is the part I built first and the thing you are using now.',
      },
      { t: 'h2', s: 'Permanent navigation' },
      {
        t: 'p',
        s: 'You set two requirements that pull against each other: the controls must never disappear, and they must never obscure the document or become irritating. Satisfying both means the control bar cannot be an overlay floating on top of the page.',
      },
      {
        t: 'p',
        s: 'So it is not one. The reader is a fixed-height flex column: the bar occupies its own band, and the page area is a separate scrolling region beneath it. The bar is always on screen because it was never in the scroll flow to begin with, and it never covers a millimetre of the document because the document was never underneath it. Scroll to the bottom of a long page and the controls have not moved.',
      },
      {
        t: 'p',
        s: 'On a phone the same structure survives, with the bar reduced to the four controls that matter — back, position, next, menu — and the rest folded into the contents drawer. Essential functionality remains, as PART 9 requires.',
      },
      { t: 'h2', s: 'Natural controls' },
      {
        t: 'p',
        s: 'Arrow keys, Page Up and Page Down, Home and End move through the document. Touch swipe works on tablet and phone. A trackpad scrolls the current page normally. All of these are conveniences layered on top of the visible buttons — nothing in the reader requires the recipient to discover a gesture, which was your point in PART 7.',
      },
      { t: 'h2', s: 'Beginning and end' },
      {
        t: 'p',
        s: 'Opening the document lands on the front cover, not page one. Pressing NEXT past the last content page brings up the branded rear cover with reduced controls. The intention, as you put it, is finishing a publication rather than reaching the bottom of a file.',
      },
    ],
  },

  {
    id: 'p6',
    size: 'A4',
    running: 'Access',
    blocks: [
      { t: 'h1', s: 'Recipient links and document isolation' },
      { t: 'h2', s: 'What the link is' },
      {
        t: 'p',
        s: 'A recipient link carries a 256-bit random token generated from the operating system CSPRNG, rendered base64url. Nothing in it is derived from the recipient, the document, a counter or a timestamp, so the tokens are not related to one another and holding one tells you nothing about any other.',
      },
      {
        t: 'p',
        s: 'The database stores only a SHA-256 hash of the token, alongside its document, expiry, revocation flag and access counters. The plaintext token exists in the issuing response and in your recipient\'s inbox — never in our storage, our logs or our backups. A stolen database dump yields no working links.',
      },
      { t: 'h2', s: 'How isolation is enforced' },
      {
        t: 'p',
        s: 'Every document read is scoped by the grant, in one place. The server resolves the token to a single grant record, and the only document identifier used from that point onward is the one on that grant. The client never supplies a document id that the server trusts. There is therefore no URL to tamper with and no id to enumerate — the request that fetches page content does not accept a document argument at all.',
      },
      {
        t: 'p',
        s: 'Files in object storage are private with no public read. The reader receives short-lived signed URLs, minted per request after authorisation, expiring in minutes. Guessing a storage path gets a recipient nothing.',
      },
      { t: 'h2', s: 'Also implemented' },
      {
        t: 'ul',
        items: [
          'Expiry and one-click revocation, both checked server-side on every request, not at issue time.',
          'Rate limiting per token and per IP, with lockout on repeated invalid tokens.',
          'Constant-time token comparison, so timing cannot be used to probe.',
          'Argon2id for administrator passwords, with TOTP two-factor.',
          'Sessions in httpOnly, Secure, SameSite cookies. No tokens in localStorage.',
          'HSTS, a strict Content-Security-Policy, and X-Robots-Tag noindex on every recipient route.',
          'Audit events written on issue, first access, each access, expiry and revocation.',
        ],
      },
    ],
  },

  {
    id: 'p7',
    size: 'A4',
    running: 'Encryption',
    blocks: [
      { t: 'h1', s: 'On "end-to-end encrypted"' },
      {
        t: 'p',
        s: 'PART 3 asks that every document be end-to-end encrypted and encrypted at rest, and accepts nothing less. I want to give you an honest answer rather than agree and quietly build something weaker — which is precisely the behaviour you warned against at the end of PART 10.',
      },
      {
        t: 'p',
        s: 'End-to-end encryption has a specific meaning: the server holds only ciphertext and cannot read the document even if compelled to. That is achievable, but it has consequences you should choose deliberately rather than inherit.',
      },
      { t: 'rule' },
      { t: 'h2', s: 'Option A — Encryption at rest and in transit' },
      {
        t: 'p',
        s: 'TLS 1.3 in transit; database and object storage encrypted at rest; strict server-side authorisation. The server can read documents, which is what makes server-side PDF generation, thumbnails and search possible. This is what almost every product on the market means when it says "encrypted". It is honest, standard, and it does not entitle anyone to print the words "end-to-end".',
      },
      { t: 'h2', s: 'Option B — Per-document envelope encryption' },
      {
        t: 'p',
        s: 'Each document gets its own key, wrapped by a master key held in a KMS rather than in the database. Plaintext exists only inside the single request that serves or generates it, never on disk. A stolen database is useless without the KMS; a compromised backup is useless on its own. All features still work. This is my recommendation, and it is a genuine and defensible step above Option A.',
      },
      { t: 'h2', s: 'Option C — True end-to-end' },
      {
        t: 'p',
        s: 'The document is encrypted in the administrator\'s browser; the key travels in the link fragment, which browsers never send to the server; the recipient\'s browser decrypts. The server truly cannot read anything. The cost is real: no server-side PDF generation, no server-side search or preview, and if a recipient loses the link the document is unrecoverable — nobody can reissue it, including you.',
      },
      {
        t: 'note',
        s: 'My recommendation is B, with the option of C for a specific class of document later — the architecture supports adding it. What I will not do is build A and label it C. Tell me which you want and the UI wording will state exactly that and no more.',
      },
    ],
  },

  {
    id: 'p8',
    size: 'A4',
    running: 'Hub & admin',
    blocks: [
      { t: 'h1', s: 'The Hub and the administrator dashboard' },
      { t: 'h2', s: 'What the recipient sees' },
      {
        t: 'p',
        s: 'The screen behind this reader is the Hub from PARTS 4 and 5: a branded document station, not a file listing. One document, clearly waiting, with a single obvious action. Dark graphite, restrained green and blue illumination, uncluttered controls.',
      },
      {
        t: 'p',
        s: 'The atmosphere panel you described is implemented the way you specified it, and I want to be exact about how. Those background entries are generated in the browser from a fixed list of shapes. They are not sampled from real documents, not counts of real activity, and no request is made to fetch them. There is no code path by which one recipient\'s information could reach another recipient\'s screen through that panel, because the panel is never given any real data to leak. Security ahead of visual effect, as you asked.',
      },
      { t: 'h2', s: 'What the administrator sees' },
      {
        t: 'p',
        s: 'A dashboard with documents in the states you listed: Draft, Ready, Published, Awaiting Access, Accessed, Expired, Revoked. Each document shows its recipients, the links issued, and timestamped audit events for issue, first open and subsequent access. Revocation is one action and takes effect on the next request.',
      },
      { t: 'h2', s: 'What an access record does and does not prove' },
      {
        t: 'p',
        s: 'You asked for this distinction, and it matters. An audit record shows that a valid token was presented from a given address at a given time, and which pages were requested. That is evidence of access. It is not evidence that a particular named person read the document, understood it, or agreed to it — a link can be forwarded, and a page can be open in a tab nobody is looking at.',
      },
      {
        t: 'p',
        s: 'If you need something closer to proof of receipt, that is recipient authentication — a one-time code to a verified address or phone before the document opens — and it is a distinct feature I would quote separately. It raises the evidential value; it still is not a signature. Anything stronger than that belongs in PART 12 as electronic signatures, which the schema is designed to accommodate.',
      },
    ],
  },

  {
    id: 'p9',
    size: 'A4',
    running: 'Delivery',
    blocks: [
      { t: 'h1', s: 'Hosting, testing and handover' },
      { t: 'h2', s: 'Hosting' },
      {
        t: 'p',
        s: 'Containerised application on Fly.io or Render, with managed PostgreSQL including point-in-time recovery, and S3-compatible object storage. Staging and production are the same image with different configuration, so what you approve on staging is what ships. TLS is issued and renewed by the platform; I verify the certificate chain and HSTS from outside the network rather than trusting the dashboard.',
      },
      {
        t: 'p',
        s: 'Recurring costs are yours and in your own accounts from day one, so nothing is tied to me: roughly $10–25/month application hosting, $15–30/month managed Postgres with backups, a few dollars for object storage at this volume, plus a transactional email provider on its free or lowest tier. Those are current list prices, not a quote, and I would rather you saw them before we start than after.',
      },
      { t: 'h2', s: 'Testing' },
      {
        t: 'ul',
        items: [
          'Unit tests on the document model, region layout and token lifecycle.',
          'Integration tests hitting a real PostgreSQL, not a mock, including expiry and revocation.',
          'Authorisation tests that assert the negative: recipient B\'s token must not reach recipient A\'s document, and must fail closed.',
          'PDF assertions on real output — page box in points, page count, fonts embedded, text extractable.',
          'End-to-end reader tests in Playwright across desktop, tablet and phone viewports, including that navigation stays visible at the bottom of a long page.',
          'Dependency audit and secret scanning in CI on every push.',
        ],
      },
      { t: 'h2', s: 'Handover' },
      {
        t: 'p',
        s: 'Everything in your OWNERSHIP & HANDOVER list, in the repository rather than in my head: source, build and deploy instructions, schema and migrations, configuration reference, dependency list, administrator guide, architecture notes, and a credentials handover procedure. The test of a good handover is that you can deploy a change yourself without me, and that is what I will have you do on the call rather than demonstrate it myself.',
      },
    ],
  },

  {
    id: 'p10',
    size: 'A4',
    running: 'Stages',
    blocks: [
      { t: 'h1', s: 'Proposed stages' },
      {
        t: 'p',
        s: 'Each stage ends in something you can look at and sign off before the next begins. Durations are working days and assume artwork and content arrive when needed.',
      },
      {
        t: 'kv',
        rows: [
          ['0 — Foundation', 'Repo, schema, migrations, CI, staging environment live. 3–4 days.'],
          ['1 — Reader', 'Cover-to-cover reader, permanent navigation, responsive, keyboard and touch. Largely what you are reading now. 5–7 days.'],
          ['2 — Templates & PDF', 'Locked artwork layer with your real covers, editable regions, A4 and A5, verified print-ready export. 6–8 days.'],
          ['3 — Hub & access', 'Recipient tokens, isolation, expiry, revocation, rate limiting, audit log, the branded Hub. 6–8 days.'],
          ['4 — Authoring', 'The document creator: pages, reordering, text styling, save and reopen, preview. 8–10 days.'],
          ['5 — Hardening & handover', 'Security pass, full test suite, documentation, production cutover, knowledge transfer. 4–5 days.'],
        ],
      },
      {
        t: 'p',
        s: 'The reader comes before the authoring interface deliberately. It is the part you care most about, the part with the most design risk, and the part where your feedback will change things — better to have you looking at it in week one than week five.',
      },
      { t: 'rule' },
      { t: 'h2', s: 'What I need from you' },
      {
        t: 'ol',
        items: [
          'The sample front and rear cover artwork, and which areas on them must be editable text.',
          'Which encryption option — A, B or C from page 7.',
          'Expected volume: documents per month, recipients per document, retention period.',
          'Whether these documents are ever commercially litho-printed, or only emailed and desk-printed.',
          'Confirmation of A5 alongside A4 in version 1, or A5 deferred.',
        ],
      },
      {
        t: 'note',
        s: 'None of these block stage 0 or the rest of the reader work. Send them when you have them.',
      },
    ],
  },
]
