import asyncio
import csv
import sys
from dataclasses import dataclass
from pathlib import Path
from playwright.async_api import async_playwright

@dataclass
class Business:
    name: str
    address: str
    website: str
    phone_number: str
    reviews_average: float | None

async def scrape(query: str, total: int, csv_path: Path):
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://www.google.com/maps", timeout=60000)
        await page.fill("//input[@id='searchboxinput']", query)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(5000)
        await page.hover("//a[contains(@href, 'https://www.google.com/maps/place')]")

        counted = 0
        listings = []
        while True:
            await page.mouse.wheel(0, 10000)
            await page.wait_for_timeout(2000)
            current = await page.locator("//a[contains(@href, 'https://www.google.com/maps/place')]").count()
            if current >= total:
                listings = await page.locator("//a[contains(@href, 'https://www.google.com/maps/place')]").all()
                listings = listings[:total]
                break
            if current == counted:
                listings = await page.locator("//a[contains(@href, 'https://www.google.com/maps/place')]").all()
                break
            counted = current

        # Write header and append rows as we go
        with csv_path.open("w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["name", "address", "website", "phone", "reviews_average"])

        for listing in listings:
            await listing.click()
            await page.wait_for_timeout(3000)

            name = await page.locator('h1.DUwDvf.lfPIob').inner_text() if await page.locator('h1.DUwDvf.lfPIob').count() else ""

            address = ""
            if await page.locator('//button[@data-item-id="address"]//div[contains(@class, "fontBodyMedium")]').count():
                elements = await page.locator('//button[@data-item-id="address"]//div[contains(@class, "fontBodyMedium")]').all()
                if elements:
                    address = await elements[0].inner_text()

            website = ""
            if await page.locator('//a[@data-item-id="authority"]//div[contains(@class, "fontBodyMedium")]').count():
                elements = await page.locator('//a[@data-item-id="authority"]//div[contains(@class, "fontBodyMedium")]').all()
                if elements:
                    website = await elements[0].inner_text()

            phone = ""
            if await page.locator('//button[contains(@data-item-id, "phone")]//div[contains(@class, "fontBodyMedium")]').count():
                elements = await page.locator('//button[contains(@data-item-id, "phone")]//div[contains(@class, "fontBodyMedium")]').all()
                if elements:
                    phone = await elements[0].inner_text()

            reviews_average = None
            if await page.locator('//div[@jsaction="pane.reviewChart.moreReviews"]//div[@role="img"]').count():
                text = await page.locator('//div[@jsaction="pane.reviewChart.moreReviews"]//div[@role="img"]').get_attribute('aria-label')
                if text:
                    try:
                        reviews_average = float(text.split()[0].replace(',', '.'))
                    except ValueError:
                        reviews_average = None

            with csv_path.open("a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    name,
                    address,
                    website,
                    phone,
                    reviews_average if reviews_average is not None else "",
                ])
        await browser.close()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python worker.py <query> <total> <output_csv>")
        sys.exit(1)
    query = sys.argv[1]
    total = int(sys.argv[2])
    csv_file = Path(sys.argv[3])
    asyncio.run(scrape(query, total, csv_file))
