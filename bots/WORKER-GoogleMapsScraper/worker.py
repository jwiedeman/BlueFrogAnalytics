import asyncio
import re
import os
import psycopg2
import sys
from dataclasses import dataclass

from playwright.async_api import async_playwright

@dataclass
class Business:
    name: str
    address: str
    website: str
    phone_number: str
    reviews_average: float | None
    query: str
    latitude: float | None
    longitude: float | None


def init_db(dsn: str) -> psycopg2.extensions.connection:
    """Create the Postgres database table if needed and return a connection."""
    conn = psycopg2.connect(dsn)
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS businesses (
                name TEXT,
                address TEXT,
                website TEXT,
                phone TEXT,
                reviews_average REAL,
                query TEXT,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                UNIQUE(name, address)
            )
            """
        )
        conn.commit()
    return conn


def save_to_db(conn: psycopg2.extensions.connection, b: Business) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO businesses (
                name, address, website, phone, reviews_average, query, latitude, longitude
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (name, address) DO NOTHING
            """,
            (
                b.name,
                b.address,
                b.website,
                b.phone_number,
                b.reviews_average,
                b.query,
                b.latitude,
                b.longitude,
            ),
        )
        conn.commit()

async def scrape(query: str, total: int, dsn: str, *, headless: bool = False):
    db_conn = init_db(dsn)

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

            url = page.url
            lat = lon = None
            match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
            if match:
                lat = float(match.group(1))
                lon = float(match.group(2))

            save_to_db(
                db_conn,
                Business(
                    name,
                    address,
                    website,
                    phone,
                    reviews_average,
                    query,
                    lat,
                    lon,
                ),
            )
        await browser.close()
    db_conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python worker.py <query> <total> <dsn> [--headless]")
        sys.exit(1)
    query = sys.argv[1]
    total = int(sys.argv[2])
    dsn = sys.argv[3]
    headless = "--headless" in sys.argv[4:]
    asyncio.run(scrape(query, total, dsn, headless=headless))
