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

All artwork and every bracketed string is a deliberate placeholder. Nothing in
this repository states a fact about any client.

## Run it

    npm install
    npm run dev      # development
    npm run build    # production build into dist/

Stack: React 19 + TypeScript, Vite. No back end in this demo — the document is
a literal in `src/document.ts`, standing in for the PostgreSQL-backed model
described in the document itself.
