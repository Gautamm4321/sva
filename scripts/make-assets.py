"""Renders the social card and app icons with the site's own fonts.
usage: python3 scripts/make-assets.py http://localhost:3100   (writes into public/ and app/)"""
import sys
import time

from playwright.sync_api import sync_playwright

BASE = sys.argv[1]
ICON_HTML = """<html><head><style>
@font-face{font-family:C;src:url(%s/fonts/playfair-display-latin-wght-normal.woff2);unicode-range:U+0000-00FF}
@font-face{font-family:C;src:url(%s/fonts/playfair-display-latin-ext-wght-normal.woff2);unicode-range:U+0100-02BA}
html,body{margin:0;background:transparent}
.r{width:512px;height:512px;border-radius:50%%;background:radial-gradient(circle at 42%% 38%%,#3A2218,#1E0F09 72%%);
box-shadow:inset 0 0 0 22px #24130C,inset 0 0 0 26px #DCAE77;display:grid;place-items:center}
.r span{font:400 170px/1 C;color:#DCAE77;transform:translateY(-14px)}
</style></head><body><div class=r><span>svā</span></div></body></html>""" % (BASE, BASE)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 512, "height": 512})
    pg.goto(BASE + "/privacy")
    pg.set_content(ICON_HTML)
    pg.wait_for_function("document.fonts.check('170px C', 'svā')", timeout=8000)
    pg.screenshot(path="app/icon.png", omit_background=True)
    pg.set_viewport_size({"width": 512, "height": 512})
    pg2 = b.new_page(viewport={"width": 180, "height": 180})
    pg2.goto(BASE + "/privacy")
    pg2.set_content(ICON_HTML.replace("512px", "180px").replace("170px", "60px").replace("22px", "8px").replace("26px", "9.5px").replace("-14px", "-5px").replace("background:transparent", "background:#F1ECE6"))
    pg2.wait_for_function("document.fonts.check('60px C', 'svā')", timeout=8000)
    pg2.screenshot(path="app/apple-icon.png")

    # Social card: the deck's cover, set in the brand fonts and colours.
    og = b.new_page(viewport={"width": 1200, "height": 630})
    og.goto(BASE + "/privacy")
    og.set_content("""<html><head><style>
    @font-face{font-family:P;src:url(%s/fonts/playfair-display-latin-wght-normal.woff2);unicode-range:U+0000-00FF}
    @font-face{font-family:P;src:url(%s/fonts/playfair-display-latin-ext-wght-normal.woff2);unicode-range:U+0100-02BA}
    @font-face{font-family:S;src:url(%s/fonts/inter-tight-latin-wght-normal.woff2)}
    body{margin:0;width:1200px;height:630px;background:#F1ECE6;display:grid;place-items:center;font-family:P}
    .w{text-align:center}.t{font-size:150px;color:#C6BAAB;line-height:1}.s{font:300 28px S;color:#C6BAAB;letter-spacing:.02em;margin-top:6px}
    </style></head><body><div class=w><div class=t>svā labs</div><div class=s>return to self</div></div></body></html>""" % (BASE, BASE, BASE))
    og.wait_for_function("document.fonts.check('150px P', 'svā')", timeout=8000)
    og.screenshot(path="public/og.jpg", type="jpeg", quality=88)
    b.close()
print("assets written")
