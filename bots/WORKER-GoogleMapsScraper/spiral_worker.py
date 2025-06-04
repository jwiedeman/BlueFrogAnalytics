import os
import asyncio
import re
import sys
import logging
from typing import Set, Tuple, Sequence

from db import init_db, save_business, get_dsn, close_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

from playwright.async_api import async_playwright


async def zoom_all_the_way_in(page, times: int = 15) -> None:
    """Fully zoom in on the map using keyboard shortcuts."""
    for _ in range(times):
        await page.keyboard.press("Shift+=")
        await page.wait_for_timeout(500)








async def collect_current_listings(page, query: str, seen: Set[Tuple[str, str]], conn):
    """Return newly discovered listings from the sidebar."""
    new_entries: list[Tuple[str, str]] = []
    listings = await page.locator("//a[contains(@href, 'https://www.google.com/maps/place')]").all()
    for listing in listings:
        href = await listing.get_attribute("href")
        if not href:
            continue
        text = await listing.inner_text()
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        if not lines:
            continue
        name = lines[0]
        address = lines[1] if len(lines) > 1 else ""
        key = (name, address)
        if key in seen:
            logger.info("Already saved: %s | %s", name, address)
            continue
        seen.add(key)
        logger.info("Saving new listing: %s | %s", name, address)
        new_entries.append(key)

        lat = lon = None
        match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", href)
        if match:
            lat = float(match.group(1))
            lon = float(match.group(2))

        save_business(
            conn,
            (
                name,
                address,
                "",
                "",
                None,
                query,
                lat,
                lon,
            ),
        )
    return new_entries


async def scrape_spiral(
    query: str,
    steps: int,
    dsn: str | None,
    *,
    headless: bool = False,
    launch_args: Sequence[str] | None = None,
):
    conn = init_db(get_dsn(dsn))
    seen: Set[Tuple[str, str]] = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=list(launch_args or []),
        )
        page = await browser.new_page()
        await page.goto("https://www.google.com/maps", timeout=60000)
        await page.fill("//input[@id='searchboxinput']", query)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(5000)

        await zoom_all_the_way_in(page)

        try:
            checkbox = page.get_by_role("checkbox", name="Update results when map moves")
            if await checkbox.count() and (await checkbox.get_attribute("aria-checked")) != "true":
                await checkbox.click()
                await page.wait_for_timeout(1000)
            # ensure the map has focus before issuing keyboard commands
            await page.mouse.click(400, 300)
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
