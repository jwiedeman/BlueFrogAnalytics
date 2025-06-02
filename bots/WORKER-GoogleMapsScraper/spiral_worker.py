import asyncio
import os
import re
import psycopg2
import sys
from dataclasses import dataclass
from typing import Set, Tuple

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
    """Create the Postgres table if needed and return a connection."""
    try:
        conn = psycopg2.connect(dsn)
    except psycopg2.OperationalError as exc:
        print(f"Failed to connect to Postgres using DSN '{dsn}': {exc}")
        print(
            "Ensure PostgreSQL is running. You can start a local instance with:\n"
            "  docker run -d --name maps-postgres -p 5432:5432 \\\n" 
            "    -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=maps postgres:15-alpine"
        )
        print("If using Docker, append 'host=localhost password=postgres' to the DSN.")
        sys.exit(1)
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


async def collect_current_listings(page, query: str, seen: Set[Tuple[str, str]], conn) -> None:
    listings = await page.locator("//a[contains(@href, 'https://www.google.com/maps/place')]" ).all()
    for listing in listings:
        href = await listing.get_attribute("href")
        if not href:
            continue
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

        key = (name, address)
        if key in seen:
            await page.go_back()
            await page.wait_for_timeout(1000)
            continue
        seen.add(key)

        url = page.url
        lat = lon = None
        match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
        if match:
            lat = float(match.group(1))
            lon = float(match.group(2))

        save_to_db(
            conn,
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
        await page.go_back()
        await page.wait_for_timeout(1000)


async def scrape_spiral(query: str, steps: int, dsn: str, *, headless: bool = False):
    conn = init_db(dsn)
    seen: Set[Tuple[str, str]] = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        page = await browser.new_page()
        await page.goto("https://www.google.com/maps", timeout=60000)
        await page.fill("//input[@id='searchboxinput']", query)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(5000)

        try:
            checkbox = page.get_by_role("checkbox", name="Update results when map moves")
            if await checkbox.count() and (await checkbox.get_attribute("aria-checked")) != "true":
                await checkbox.click()
                await page.wait_for_timeout(1000)
        except Exception:
            pass

        await collect_current_listings(page, query, seen, conn)

        arrow_keys = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"]
        step_length = 1
        direction = 0

        for _ in range(steps):
            for _ in range(2):
                for _ in range(step_length):
                    await page.keyboard.press(arrow_keys[direction])
                    await page.wait_for_timeout(1500)
                    await collect_current_listings(page, query, seen, conn)
                direction = (direction + 1) % 4
            step_length += 1

        await browser.close()
    conn.close()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--headless"]
    headless = "--headless" in sys.argv[1:]

    if len(args) < 2:
        print(
            "Usage: python spiral_worker.py <query> <steps> [dsn] [--headless]"
        )
        sys.exit(1)

    query = args[0]
    steps = int(args[1])
    dsn = args[2] if len(args) >= 3 else os.environ.get(
        "POSTGRES_DSN", "dbname=maps user=postgres host=localhost password=postgres"
    )

    asyncio.run(scrape_spiral(query, steps, dsn, headless=headless))
