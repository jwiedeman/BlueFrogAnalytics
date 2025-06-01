import asyncio
import csv
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Set, Tuple

from geopy.geocoders import Nominatim
from playwright.async_api import async_playwright


@dataclass
class Business:
    name: str
    address: str
    website: str
    phone_number: str
    reviews_average: float | None


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
            reviews_average REAL
        )
        """
    )
    conn.commit()
    return conn


def save_to_db(conn: sqlite3.Connection, b: Business) -> None:
    conn.execute(
        "INSERT INTO businesses (name, address, website, phone, reviews_average) VALUES (?, ?, ?, ?, ?)",
        (b.name, b.address, b.website, b.phone_number, b.reviews_average),
    )
    conn.commit()


async def scrape_at_location(
    page,
    query: str,
    total: int,
    lat: float,
    lon: float,
    seen: Set[Tuple[str, str]],
    writer,
    csv_file,
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

        writer.writerow([
            name,
            address,
            website,
            phone,
            reviews_average if reviews_average is not None else "",
        ])
        csv_file.flush()
        save_to_db(
            conn,
            Business(name, address, website, phone, reviews_average),
        )


async def scrape_city_grid(city: str, query: str, steps: int, spacing: float, total: int, csv_path: Path):
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    db_conn = init_db(csv_path.with_suffix(".db"))
    csv_exists = csv_path.exists()
    seen: Set[Tuple[str, str]] = set()
    if csv_exists:
        with csv_path.open("r", newline="") as existing:
            reader = csv.reader(existing)
            next(reader, None)
            for row in reader:
                if row:
                    seen.add((row[0], row[1]))
    geolocator = Nominatim(user_agent="bluefrog-grid")
    location = geolocator.geocode(city)
    if not location:
        raise ValueError(f"Could not geocode city: {city}")

    lat_center = location.latitude
    lon_center = location.longitude

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        with csv_path.open("a", newline="") as f:
            writer = csv.writer(f)
            if not csv_exists:
                writer.writerow(["name", "address", "website", "phone", "reviews_average"])
            for i in range(-steps, steps + 1):
                for j in range(-steps, steps + 1):
                    lat = lat_center + i * spacing
                    lon = lon_center + j * spacing
                    await scrape_at_location(page, query, total, lat, lon, seen, writer, f, db_conn)

        await browser.close()
    db_conn.close()


if __name__ == "__main__":
    if len(sys.argv) < 7:
        print(
            "Usage: python grid_worker.py <city> <query> <steps> <spacing_deg> <per_grid_total> <output_csv>"
        )
        sys.exit(1)
    city = sys.argv[1]
    query = sys.argv[2]
    steps = int(sys.argv[3])
    spacing = float(sys.argv[4])
    per_grid_total = int(sys.argv[5])
    csv_file = Path(sys.argv[6])
    asyncio.run(scrape_city_grid(city, query, steps, spacing, per_grid_total, csv_file))
