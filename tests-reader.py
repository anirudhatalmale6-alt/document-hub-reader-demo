from playwright.sync_api import sync_playwright
import sys, os

OUT = "/var/lib/freelancer/projects/40697376/shots"
os.makedirs(OUT, exist_ok=True)
URL = "http://localhost:4317/"

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(URL, wait_until="networkidle")
    pg.screenshot(path=f"{OUT}/01-hub.png")

    pg.click(".open-btn")
    pg.wait_for_timeout(600)
    pg.screenshot(path=f"{OUT}/02-front-cover.png")

    # overflow audit: walk every content page, measure body scrollHeight
    overflow = []
    for i in range(11):
        pg.keyboard.press("ArrowRight")
        pg.wait_for_timeout(250)
        r = pg.evaluate("""() => {
            const b = document.querySelector('.screen .page.content .body');
            if (!b) return null;
            const run = document.querySelector('.screen .page.content .running span');
            return {name: run ? run.textContent : '?', sh: b.scrollHeight, ch: b.clientHeight};
        }""")
        if r:
            over = r['sh'] - r['ch']
            overflow.append((i+1, r['name'], round(over)))
        if i == 3:
            pg.screenshot(path=f"{OUT}/03-page4.png")
    pg.wait_for_timeout(300)
    pg.screenshot(path=f"{OUT}/04-rear-cover.png")

    print("OVERFLOW (px over the text box, negative = fits):")
    for n, name, o in overflow:
        flag = "  <-- OVERFLOWS" if o > 0 else ""
        print(f"  p{n:<3} {name:<14} {o:+5}{flag}")

    # contents drawer
    pg.keyboard.press("Home")
    pg.wait_for_timeout(200)
    for _ in range(5):
        pg.keyboard.press("ArrowRight")
    pg.wait_for_timeout(300)
    pg.click("button[aria-expanded]")
    pg.wait_for_timeout(400)
    pg.screenshot(path=f"{OUT}/05-contents.png")
    pg.keyboard.press("Escape")

    # fit-width + scrolled to bottom: is the nav bar still on screen?
    pg.click(".fitbtn")
    pg.wait_for_timeout(400)
    pg.evaluate("document.querySelector('.stage').scrollTo(0, 99999)")
    pg.wait_for_timeout(400)
    bar = pg.evaluate("""() => {
        const r = document.querySelector('.bar').getBoundingClientRect();
        const st = document.querySelector('.stage');
        const pr = document.querySelector('.scaler').getBoundingClientRect();
        return {barTop: r.top, barBottom: r.bottom, scrolled: st.scrollTop,
                maxScroll: st.scrollHeight - st.clientHeight, pageTop: pr.top};
    }""")
    print("\nNAV BAR while scrolled to the bottom of a page:", bar)
    pg.screenshot(path=f"{OUT}/06-fitwidth-scrolled.png")

    # mobile
    m = b.new_page(viewport={"width": 390, "height": 780}, device_scale_factor=2)
    m.goto(URL, wait_until="networkidle")
    m.wait_for_timeout(500)
    m.screenshot(path=f"{OUT}/07-mobile-hub.png")
    m.click(".open-btn")
    m.wait_for_timeout(500)
    for _ in range(3):
        m.keyboard.press("ArrowRight")
    m.wait_for_timeout(500)
    m.screenshot(path=f"{OUT}/08-mobile-reader.png")
    print("\nmobile bar:", m.evaluate("JSON.stringify(document.querySelector('.bar').getBoundingClientRect())"))

    # print-ready PDF from the same page model
    pd = b.new_page(viewport={"width": 1280, "height": 900})
    pd.goto(URL, wait_until="networkidle")
    pd.wait_for_timeout(800)
    pd.emulate_media(media="print")
    pd.pdf(path="/var/lib/freelancer/projects/40697376/ZeroSphere-Reader-Proposal-DEMO.pdf",
           width="210mm", height="297mm", print_background=True, prefer_css_page_size=True)
    b.close()
print("\ndone")
