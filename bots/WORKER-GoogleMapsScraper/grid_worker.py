import os
import asyncio
import random
import re
from typing import Sequence, Set, Tuple

from geopy.geocoders import Nominatim
from playwright.async_api import async_playwright
from db import init_db, save_business, get_dsn, close_db


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

        save_business(
            conn,
            (
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
    dsn: str | None,
    *,
    headless: bool = False,
    min_delay: float = 15.0,
    max_delay: float = 60.0,
    launch_args: Sequence[str] | None = None,
):
    db_conn = init_db(get_dsn(dsn))
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
    close_db(db_conn)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scrape a city grid from Google Maps")
    parser.add_argument("city")
    parser.add_argument("steps", type=int)
    parser.add_argument("spacing_deg", type=float)
    parser.add_argument("per_grid_total", type=int)
    parser.add_argument("dsn", nargs="?", help="Postgres DSN")
    parser.add_argument("--query", help="Single search term")
    parser.add_argument("--terms", help="Comma separated list of search terms")
    parser.add_argument("--headless", action="store_true", help="Run browser headless")
    parser.add_argument("--min-delay", type=float, default=15.0, help="Minimum delay between grid steps in seconds")
    parser.add_argument("--max-delay", type=float, default=60.0, help="Maximum delay between grid steps in seconds")
    parser.add_argument("--store", choices=["postgres", "cassandra", "sqlite", "csv"], help="Storage backend")
    args = parser.parse_args()

    if args.store:
        os.environ["MAPS_STORAGE"] = args.store

    queries = []
    if args.terms:
        queries.extend([t.strip() for t in args.terms.split(',') if t.strip()])
    if args.query:
        queries.insert(0, args.query)
    if not queries:
        parser.error("Provide a query or --terms")

    async def main():
        for term in queries:
            await scrape_city_grid(
                args.city,
                term,
                args.steps,
                args.spacing_deg,
                args.per_grid_total,
                args.dsn,
                headless=args.headless,
                min_delay=args.min_delay,
                max_delay=args.max_delay,
            )

    asyncio.run(main())
