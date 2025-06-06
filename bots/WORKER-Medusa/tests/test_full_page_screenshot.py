from playwright.sync_api import sync_playwright
import os


def run_test(target, out_dir="screenshots"):
    """Capture a full page screenshot of the target domain."""
    os.makedirs(out_dir, exist_ok=True)
    filename = os.path.join(out_dir, target.replace("://", "_").replace("/", "_") + ".png")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f"https://{target}", wait_until="networkidle")
        page.screenshot(path=filename, full_page=True)
        browser.close()
    return filename
