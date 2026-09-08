# Document Hub & Reader — demonstration build

A working demonstration of a branded secure document Hub and a cover-to-cover
document reader, plus the print-ready A4 PDF produced from the same page model.

Live demo: https://anirudhatalmale6-alt.github.io/document-hub-reader-demo/

## What this shows

- **Hub** — a branded document station rather than a file listing. The
  background "station activity" entries are synthetic, generated in the browser
  from a fixed list, and carry no real data.
- **Reader** — opens on the front cover, pages through A4 content, ends on the
  branded rear cover with simplified closing controls.
- **Permanent navigation** — the control bar is a band in a fixed-height flex
  column, not an overlay. It cannot scroll away and it never covers the page.
- **Templates** — `src/template.tsx` keeps the locked artwork layer and the
  editable text regions strictly separate. Regions are positioned in
  millimetres against the true page box. Changing wording never touches artwork.
- **PDF** — `Print / PDF` prints the complete document at true A4 (210 × 297 mm)
  with live, selectable text.
- **Document creator** (`DOCUMENT CREATOR` in the Hub header) — add, duplicate,
  reorder and delete pages; headings, bold/italic/underline, alignment, text
  size, paragraph spacing, page numbering, A4 or A5 per page; edit the cover's
  text regions without touching its artwork; save and reopen drafts; preview
  the result in the reader. It warns when text runs past the bottom of the
  sheet, which a fixed-page tool has to do.

### Known limits of this demo

- Drafts save to `localStorage`, not a server. In the real system a draft is a
  row in PostgreSQL.
- Inline formatting uses `document.execCommand`, which is deprecated. It is the
  only option without an editor framework; production would use Lexical or
  ProseMirror so formatting is data rather than HTML. Everything read out of the
  editable areas is sanitised against an allow-list (`clean()` in
  `src/Editor.tsx`) — scripts, event handlers and images cannot reach the model.
- Headless Chromium embeds webfonts as Type 3 subsets. The text is vector and
  selectable, but that is not the same as TrueType embedding; a production
  pipeline would fix that before anything goes to a commercial printer.

All artwork and every bracketed string is a deliberate placeholder. Nothing in
this repository states a fact about any client.

## Run it

    npm install
    npm run dev      # development
    npm run build    # production build into dist/

Stack: React 19 + TypeScript, Vite. No back end in this demo — the document is
a literal in `src/document.ts`, standing in for the PostgreSQL-backed model
described in the document itself.
