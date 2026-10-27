"""Visual smoke test: screenshots + console errors + horizontal overflow.

usage: python3 scripts/shoot.py http://localhost:3100 out_dir [scenario...]
Runs headless Chromium with SwiftShader so WebGL works without a GPU.
"""
import json
import sys
import time

from playwright.sync_api import sync_playwright

BASE = sys.argv[1]
OUT = sys.argv[2]
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

VIEWPORTS = {
    "desktop": dict(viewport={"width": 1440, "height": 900}),
    "laptop": dict(viewport={"width": 1280, "height": 720}),
    "tablet": dict(viewport={"width": 834, "height": 1112}, has_touch=True, is_mobile=True),
    "mobile": dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2),
    "small": dict(viewport={"width": 320, "height": 640}, has_touch=True, is_mobile=True),
}


def run(name, opts, page_fn=None, query=""):
    report = {"name": name, "console": [], "overflow": None}
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx = b.new_context(**opts)
        page = ctx.new_page()
        page.on("console", lambda m: m.type in ("error", "warning") and report["console"].append(f"{m.type}: {m.text}"))
        page.on("pageerror", lambda e: report["console"].append(f"pageerror: {e}"))
        page.goto(BASE + "/" + query, wait_until="networkidle")
        time.sleep(7)
        page.screenshot(path=f"{OUT}/{name}-hero.png")
        report["overflow"] = page.evaluate(
            "() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})"
        )
        if page_fn:
            page_fn(page, name, report)
        b.close()
    return report


def tour(page, name, report):
    # Sweep through the strands, then breathe.
    vw = page.viewport_size["width"]
    vh = page.viewport_size["height"]
    for k in range(30):
        page.mouse.move(vw * (0.45 + 0.25 * (k / 30)), vh * (0.35 + 0.3 * ((k % 10) / 10)))
        time.sleep(0.03)
    time.sleep(0.4)
    page.screenshot(path=f"{OUT}/{name}-swept.png")
    page.mouse.move(vw * 0.2, vh * 0.2)
    page.mouse.down()
    time.sleep(2.5)
    page.screenshot(path=f"{OUT}/{name}-inhale.png")
    page.mouse.up()
    time.sleep(0.6)
    page.screenshot(path=f"{OUT}/{name}-exhale.png")
    # Next piece.
    page.click(".thumb--next")
    time.sleep(3)
    page.screenshot(path=f"{OUT}/{name}-slide2.png")
    for k in range(2):
        page.click(".thumb--next")
        time.sleep(2.5)
        page.screenshot(path=f"{OUT}/{name}-slide{k + 3}.png")
    page.click(".thumb--next")
    time.sleep(2.5)
    page.screenshot(path=f"{OUT}/{name}-slide5.png")
    # Scroll the page.
    for frac, label in [(1.0, "philosophy"), (2.4, "lineup-a"), (3.4, "lineup-b"), (4.2, "lineup-c")]:
        page.evaluate(f"window.scrollTo(0, {frac} * window.innerHeight)")
        time.sleep(3)
        page.screenshot(path=f"{OUT}/{name}-{label}.png")
    page.evaluate("document.getElementById('join').scrollIntoView()")
    time.sleep(2)
    page.screenshot(path=f"{OUT}/{name}-join.png")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(1.5)
    page.screenshot(path=f"{OUT}/{name}-footer.png")
    report["fps"] = page.evaluate(
        """() => new Promise(r => { let n = 0; const t0 = performance.now();
        const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); };
        requestAnimationFrame(f); })"""
    )


if __name__ == "__main__":
    which = sys.argv[3:] or ["desktop", "mobile"]
    results = []
    for w in which:
        if w == "fallback":
            results.append(run("fallback", VIEWPORTS["desktop"], query="?nowebgl"))
        elif w == "reduced":
            results.append(run("reduced", {**VIEWPORTS["desktop"], "reduced_motion": "reduce"}))
        else:
            results.append(run(w, VIEWPORTS[w], tour if w in ("desktop", "mobile") else None))
    print(json.dumps(results, indent=1))
