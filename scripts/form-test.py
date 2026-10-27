"""Browser test of the waitlist form: client validation, success, duplicate.
usage: python3 scripts/form-test.py http://localhost:3101 out_dir"""
import sys
import time

from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1], sys.argv[2]
results = []


def check(name, cond):
    results.append((name, cond))
    print(("PASS  " if cond else "FAIL  ") + name)


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    page = b.new_page(viewport={"width": 1280, "height": 800})
    page.goto(BASE + "/?nowebgl#join", wait_until="networkidle")
    page.evaluate("document.getElementById('join').scrollIntoView()")
    time.sleep(2.5)  # also clears the server-side minimum fill time

    page.click("button[type=submit]")
    time.sleep(0.4)
    check("empty submit shows name error", page.locator("#wl-name-err").is_visible())
    check("empty submit shows email error", page.locator("#wl-email-err").is_visible())
    check("empty submit shows consent error", page.locator("#wl-consent-err").is_visible())
    check("focus moved to first invalid field", page.evaluate("document.activeElement.id") == "wl-name")
    page.screenshot(path=f"{OUT}/form-errors.png")

    page.fill("#wl-name", "Anaya Shah")
    page.fill("#wl-email", "anaya@bad")
    page.check("#wl-consent")
    page.click("button[type=submit]")
    time.sleep(0.4)
    check("bad email caught client-side", page.locator("#wl-email-err").is_visible())

    page.fill("#wl-email", "Anaya@Example.com")
    page.click("button[type=submit]")
    page.wait_for_selector(".wl-done", timeout=10000)
    check("success state shown", "Thank you" in page.inner_text(".wl-done"))
    page.screenshot(path=f"{OUT}/form-success.png")

    page2 = b.new_page(viewport={"width": 390, "height": 844})
    page2.goto(BASE + "/?nowebgl", wait_until="networkidle")
    page2.evaluate("document.getElementById('join').scrollIntoView()")
    time.sleep(2.5)
    page2.fill("#wl-name", "Anaya")
    page2.fill("#wl-email", "anaya@example.com")
    page2.check("#wl-consent")
    page2.click("button[type=submit]")
    page2.wait_for_selector(".wl-done", timeout=10000)
    check("duplicate shows 'already' state", "Welcome back" in page2.inner_text(".wl-done"))
    page2.screenshot(path=f"{OUT}/form-duplicate-mobile.png")
    b.close()

print(f"{sum(c for _, c in results)}/{len(results)} passed")
