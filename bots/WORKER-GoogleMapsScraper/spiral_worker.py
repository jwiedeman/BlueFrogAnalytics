import os
import asyncio
import re
import sys
from typing import Set, Tuple

from db import init_db, save_business, get_dsn, close_db

from playwright.async_api import async_playwright








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

        save_business(
            conn,
            (
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


async def scrape_spiral(query: str, steps: int, dsn: str | None, *, headless: bool = False):
    conn = init_db(get_dsn(dsn))
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
    close_db(conn)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scrape Google Maps in a spiral")
    parser.add_argument("query")
    parser.add_argument("steps", type=int)
    parser.add_argument("dsn", nargs="?", help="Postgres DSN")
    parser.add_argument("--headless", action="store_true", help="Run browser headless")
    parser.add_argument(
        "--store",
        choices=["postgres", "cassandra", "sqlite", "csv"],
        help="Storage backend",
    )
    args = parser.parse_args()

    if args.store:
        os.environ["MAPS_STORAGE"] = args.store

    asyncio.run(
        scrape_spiral(
            args.query,
            args.steps,
            get_dsn(args.dsn),
            headless=args.headless,
        )
    )
