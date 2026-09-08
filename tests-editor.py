from playwright.sync_api import sync_playwright
import sys

OUT = "/var/lib/freelancer/projects/40697376/shots"
URL = "http://localhost:4317/"
fails = []


def check(name, cond, detail=""):
    print(f"  {'PASS' if cond else 'FAIL'}  {name} {detail}")
    if not cond:
        fails.append(name)


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until="networkidle")

    pg.click(".admin-link")
    pg.wait_for_timeout(600)
    check("editor opens", pg.locator(".ed-toolbar").is_visible())
    pg.screenshot(path=f"{OUT}/20-editor.png")

    def npages():
        return pg.locator(".ed-thumb").count() - 2  # minus the two covers

    check("starts with 1 page", npages() == 1, f"(got {npages()})")

    # --- type into the page ---
    body = pg.locator(".page.content.editing .body")
    body.click()
    pg.keyboard.press("Control+A")
    pg.keyboard.type("Testing the creator")
    pg.wait_for_timeout(200)
    check("typing lands in the page", "Testing the creator" in body.inner_text())

    # --- bold applies ---
    pg.keyboard.down("Shift")
    for _ in range(7):
        pg.keyboard.press("ArrowLeft")
    pg.keyboard.up("Shift")
    pg.click('.tool[title="Bold"]')
    pg.wait_for_timeout(250)
    html = body.inner_html()
    check("bold produces markup", "<b>" in html.lower() or "<strong>" in html.lower(), f"({html[:70]})")

    # --- heading ---
    pg.click('.tool[title="Sub-heading"]')
    pg.wait_for_timeout(250)
    check("H2 applies", "<h2" in body.inner_html().lower())

    # --- add page ---
    pg.click('.tool[title="Add a page after this one"]')
    pg.wait_for_timeout(300)
    check("add page", npages() == 2, f"(got {npages()})")

    # --- duplicate ---
    pg.click('.tool[title="Duplicate this page"]')
    pg.wait_for_timeout(300)
    check("duplicate page", npages() == 3, f"(got {npages()})")

    # --- running head edit, then reorder and confirm the ORDER changed ---
    run = pg.locator(".ed-running")
    run.click()
    pg.keyboard.press("Control+A")
    pg.keyboard.type("ZZZ-marker")
    pg.wait_for_timeout(250)
    order_before = pg.locator(".ed-thumb-t").all_inner_texts()
    pg.click('.tool[title="Move page up"]')
    pg.wait_for_timeout(300)
    order_after = pg.locator(".ed-thumb-t").all_inner_texts()
    check("reorder changes page order", order_before != order_after, f"{order_before} -> {order_after}")
    check("moved page kept its name", "ZZZ-marker" in order_after,
          f"(marker at index {order_after.index('ZZZ-marker') if 'ZZZ-marker' in order_after else -1})")

    # --- delete ---
    pg.click('.tool[title="Delete this page"]')
    pg.wait_for_timeout(300)
    check("delete page", npages() == 2, f"(got {npages()})")

    # --- A5 changes the actual page box ---
    pg.click('.ed-thumb >> nth=1')
    pg.wait_for_timeout(200)
    a4 = pg.evaluate("() => {const r=document.querySelector('.page.content.editing').getBoundingClientRect(); return r.width/r.height}")
    pg.click('.tool[title="A5 — 148 × 210 mm"]')
    pg.wait_for_timeout(400)
    a5 = pg.evaluate("() => {const r=document.querySelector('.page.content.editing').getBoundingClientRect(); return r.width/r.height}")
    check("A4 aspect correct", abs(a4 - 210 / 297) < 0.005, f"({a4:.4f} vs {210/297:.4f})")
    check("A5 aspect correct", abs(a5 - 148 / 210) < 0.005, f"({a5:.4f} vs {148/210:.4f})")
    pg.click('.tool[title="A4 — 210 × 297 mm"]')
    pg.wait_for_timeout(300)

    # --- overflow warning: type until it fires (positive control for the checker) ---
    pg.locator(".page.content.editing .body").click()
    pg.keyboard.press("Control+A")
    pg.keyboard.type("Overflow test. ")
    warn_before = pg.locator(".ed-status .warn").count()
    pg.evaluate("""() => {
        const b = document.querySelector('.page.content.editing .body');
        for (let i = 0; i < 40; i++) { const p = document.createElement('p'); p.textContent = 'Filler paragraph '.repeat(12); b.appendChild(p); }
        b.dispatchEvent(new Event('input', {bubbles: true}));
    }""")
    pg.wait_for_timeout(500)
    warn_after = pg.locator(".ed-status .warn").count()
    check("overflow warning silent when it fits", warn_before == 0)
    check("overflow warning fires when text runs off the page", warn_after == 1,
          f"(status: {pg.locator('.ed-status').inner_text()[:80]})")
    pg.screenshot(path=f"{OUT}/21-editor-overflow.png")
    # undo the filler
    pg.locator(".page.content.editing .body").click()
    pg.keyboard.press("Control+A")
    pg.keyboard.type("Back to a short page.")
    pg.wait_for_timeout(400)
    check("warning clears again", pg.locator(".ed-status .warn").count() == 0)

    # --- cover editing: text changes, artwork does not ---
    pg.click('.ed-thumb >> nth=0')
    pg.wait_for_timeout(400)
    art_before = pg.evaluate("() => document.querySelector('.page.cover.editing .locked').innerHTML.length")
    ta = pg.locator('.editable-region textarea >> nth=1')
    ta.click()
    pg.keyboard.press("Control+A")
    pg.keyboard.type("Edited Cover Title")
    pg.wait_for_timeout(300)
    art_after = pg.evaluate("() => document.querySelector('.page.cover.editing .locked').innerHTML.length")
    check("cover text edits", ta.input_value() == "Edited Cover Title")
    check("artwork untouched by a wording change", art_before == art_after, f"({art_before} vs {art_after})")
    check("artwork is not reachable by the pointer",
          pg.evaluate("() => getComputedStyle(document.querySelector('.page.cover.editing .locked')).pointerEvents") == "none")
    pg.screenshot(path=f"{OUT}/22-editor-cover.png")

    # --- save / reopen round trip ---
    name = pg.locator(".ed-name")
    name.click()
    pg.keyboard.press("Control+A")
    pg.keyboard.type("Round Trip Doc")
    pg.click('.tool[title="Save this draft"]')
    pg.wait_for_timeout(500)
    saved = pg.evaluate("() => JSON.parse(localStorage.getItem('hubdemo.drafts.v1')||'[]').length")
    check("draft saved", saved >= 1, f"({saved} in storage)")

    pg.reload(wait_until="networkidle")
    pg.click(".admin-link")
    pg.wait_for_timeout(400)
    pg.click('.tool[title="Reopen a saved draft"]')
    pg.wait_for_timeout(400)
    check("saved draft listed after reload", pg.locator(".ed-open .toc-item").count() >= 1)
    pg.click(".ed-open .toc-item >> nth=0")
    pg.wait_for_timeout(500)
    check("reopened name restored", pg.locator(".ed-name").input_value() == "Round Trip Doc",
          f"(got '{pg.locator('.ed-name').input_value()}')")
    pg.click('.ed-thumb >> nth=0')
    pg.wait_for_timeout(400)
    restored = pg.locator('.editable-region textarea >> nth=1').input_value()
    check("reopened cover text restored", restored == "Edited Cover Title", f"(got '{restored}')")

    # --- preview goes to the reader with MY document, not the proposal ---
    pg.click('.tool[title="Preview in the reader"]')
    pg.wait_for_timeout(600)
    check("preview opens the reader", pg.locator(".bar").is_visible())
    cover_title = pg.locator('.screen .page.cover .region[data-region="title"]').inner_text()
    check("preview shows the edited document", "Edited Cover Title" in cover_title, f"(got '{cover_title}')")
    pg.screenshot(path=f"{OUT}/23-preview.png")
    pg.keyboard.press("ArrowRight")
    pg.wait_for_timeout(300)
    check("preview exit label", "BACK TO EDITING" in pg.locator(".bar-right").inner_text())
    pg.click(".btn.exit")
    pg.wait_for_timeout(400)
    check("returns to the editor", pg.locator(".ed-toolbar").is_visible())

    # --- sanitiser ---
    bad = pg.evaluate("""() => {
        const b = document.querySelector('.page.content.editing .body');
        b.innerHTML = '<p onclick="alert(1)">hi</p><script>alert(2)<\\/script><img src=x onerror="alert(3)"><b>keep</b>';
        b.dispatchEvent(new Event('input', {bubbles: true}));
        return true;
    }""")
    pg.wait_for_timeout(900)
    stored = pg.evaluate("""() => {
        const b = document.querySelector('.page.content.editing .body');
        return b.innerHTML;
    }""")
    pg.click('.tool[title="Save this draft"]')
    pg.wait_for_timeout(400)
    persisted = pg.evaluate("""() => {
        const d = JSON.parse(localStorage.getItem('hubdemo.drafts.v1')||'[]')[0];
        return JSON.stringify(d.pages.map(p => p.html));
    }""")
    check("no script survives into the model", "<script" not in persisted.lower())
    check("no event handler survives", "onclick" not in persisted.lower() and "onerror" not in persisted.lower())
    check("no img survives", "<img" not in persisted.lower())
    check("legitimate formatting kept", "<b>keep</b>" in persisted.lower(), f"({persisted[:120]})")

    print("\nconsole/page errors:", errs[:5] if errs else "none")
    if errs:
        fails.append("console errors")

    # print output for the edited document
    pg.emulate_media(media="print")
    pg.pdf(path="/var/lib/freelancer/projects/40697376/editor-output.pdf",
           width="210mm", height="297mm", print_background=True, prefer_css_page_size=True)
    b.close()

print("\n" + ("ALL PASS" if not fails else f"FAILURES: {fails}"))
sys.exit(1 if fails else 0)
