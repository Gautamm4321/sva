"""Visual smoke test: screenshots per section, console errors, horizontal overflow.

usage: python3 scripts/shoot.py http://localhost:3000 out_dir [desktop mobile small tablet fallback reduced]
Runs headless Chromium with SwiftShader so WebGL works without a GPU.
"""
import json
import sys
import time

from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1], sys.argv[2]
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
VIEW = {
    "desktop": dict(viewport={"width": 1440, "height": 900}),
    "tablet": dict(viewport={"width": 834, "height": 1112}, has_touch=True, is_mobile=True),
    "mobile": dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2),
    "small": dict(viewport={"width": 320, "height": 640}, has_touch=True, is_mobile=True),
}

out = []
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    for name in sys.argv[3:] or ["desktop", "mobile"]:
        opts = dict(VIEW.get(name, VIEW["desktop"]))
        q = ""
        if name == "fallback":
            q = "?nowebgl"
        if name == "reduced":
            opts["reduced_motion"] = "reduce"
        page = b.new_page(**opts)
        errs = []
        page.on("console", lambda m: m.type == "error" and errs.append(m.text))
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(BASE + "/" + q, wait_until="networkidle")
        time.sleep(8)
        page.screenshot(path=f"{OUT}/{name}-hero.png")
        if name == "desktop":
            w, h = 1440, 900
            for k in range(25):
                page.mouse.move(w * (0.5 + 0.35 * k / 25), h * (0.15 + 0.25 * ((k % 8) / 8)))
                time.sleep(0.04)
            page.screenshot(path=f"{OUT}/{name}-swept.png")
        for sec in ("about", "join"):
            page.evaluate(f"document.getElementById('{sec}').scrollIntoView()")
            time.sleep(2)
            page.screenshot(path=f"{OUT}/{name}-{sec}.png")
        out.append({"name": name, "errors": errs, "overflow": page.evaluate("[document.documentElement.scrollWidth, innerWidth]")})
        page.close()
    b.close()
print(json.dumps(out, indent=1))
