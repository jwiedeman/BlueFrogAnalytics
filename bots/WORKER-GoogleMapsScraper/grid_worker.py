import asyncio
import random
import re
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence, Set, Tuple

from geopy.geocoders import Nominatim
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


def init_db(db_path: Path) -> sqlite3.Connection:
    """Create the SQLite database if needed and return a connection."""
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS businesses (
            name TEXT,
            address TEXT,
            website TEXT,
            phone TEXT,
            reviews_average REAL,
            query TEXT,
            latitude REAL,
            longitude REAL,
            UNIQUE(name, address)
        )
        """
    )
    conn.commit()
    return conn


def save_to_db(conn: sqlite3.Connection, b: Business) -> None:
    conn.execute(
        """
        INSERT OR IGNORE INTO businesses (
            name, address, website, phone, reviews_average, query, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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


async def scrape_at_location(
    page,
    query: str,
    total: int,
    lat: float,
    lon: float,
    seen: Set[Tuple[str, str]],
    conn,
):
    await page.goto(f"https://www.google.com/maps/@{lat},{lon},17z", timeout=60000)
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

        key = (name, address)
        if key in seen:
            continue
        seen.add(key)

        url = page.url
        match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
        lat_val = float(match.group(1)) if match else lat
        lon_val = float(match.group(2)) if match else lon

        save_to_db(
            conn,
            Business(
                name,
                address,
                website,
                phone,
                reviews_average,
                query,
                lat_val,
                lon_val,
            ),
        )


async def scrape_city_grid(
    city: str,
    query: str,
    steps: int,
    spacing: float,
    total: int,
    db_path: Path,
    *,
    headless: bool = False,
    min_delay: float = 15.0,
    max_delay: float = 60.0,
    launch_args: Sequence[str] | None = None,
):
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_conn = init_db(db_path)
    seen: Set[Tuple[str, str]] = set()
    geolocator = Nominatim(user_agent="bluefrog-grid")
    location = geolocator.geocode(city)
    if not location:
        raise ValueError(f"Could not geocode city: {city}")

    lat_center = location.latitude
    lon_center = location.longitude

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=list(launch_args or []),
        )
        page = await browser.new_page()

        coords = [
            (i, j)
            for i in range(-steps, steps + 1)
            for j in range(-steps, steps + 1)
        ]
        random.shuffle(coords)
        for i, j in coords:
            lat = lat_center + i * spacing
            lon = lon_center + j * spacing
            await scrape_at_location(page, query, total, lat, lon, seen, db_conn)
            delay = random.uniform(min_delay, max_delay)
            await page.wait_for_timeout(int(delay * 1000))

        await browser.close()
    db_conn.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scrape a city grid from Google Maps")
    parser.add_argument("city")
    parser.add_argument("query")
    parser.add_argument("steps", type=int)
    parser.add_argument("spacing_deg", type=float)
    parser.add_argument("per_grid_total", type=int)
    parser.add_argument("database")
    parser.add_argument("--headless", action="store_true", help="Run browser headless")
    parser.add_argument("--min-delay", type=float, default=15.0, help="Minimum delay between grid steps in seconds")
    parser.add_argument("--max-delay", type=float, default=60.0, help="Maximum delay between grid steps in seconds")
    args = parser.parse_args()

    asyncio.run(
        scrape_city_grid(
            args.city,
            args.query,
            args.steps,
            args.spacing_deg,
            args.per_grid_total,
            Path(args.database),
            headless=args.headless,
            min_delay=args.min_delay,
            max_delay=args.max_delay,
        )
    )
