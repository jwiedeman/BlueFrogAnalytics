import argparse
import asyncio
import math
from asyncio import Semaphore, Queue
from db import get_dsn
from grid_worker import scrape_city_grid
import os


def compute_layout(n: int, screen_w: int, screen_h: int) -> tuple[int, int, int, int]:
    cols = int(math.sqrt(n))
    if cols * cols < n:
        cols += 1
    rows = (n + cols - 1) // cols
    width = max(300, screen_w // cols)
    height = max(300, screen_h // rows)
    return cols, rows, width, height


async def run_city(city: str, terms: list[str], args, slots: Queue, sem: Semaphore, width: int, height: int):
    async with sem:
        row, col = await slots.get()
        x = col * width
        y = row * height
        launch_args = [
            f"--window-size={width},{height}",
            f"--window-position={x},{y}",
        ]
        try:
            for term in terms:
                search = f"{city} {term}".strip()
                await scrape_city_grid(
                    city,
                    search,
                    args.steps,
                    args.spacing_deg,
                    args.per_grid_total,
                    get_dsn(args.dsn),
                    headless=args.headless,
                    min_delay=args.min_delay,
                    max_delay=args.max_delay,
                    launch_args=launch_args,
                )
        finally:
            slots.put_nowait((row, col))


async def worker(city_queue: Queue, terms: list[str], args, slots: Queue, sem: Semaphore, width: int, height: int, index: int):
    delay = index * args.launch_stagger
    if delay > 0:
        await asyncio.sleep(delay)
    while True:
        city = await city_queue.get()
        try:
            await run_city(city, terms, args, slots, sem, width, height)
        except Exception as e:
            print(f"Error processing city '{city}': {e}")
        finally:
            city_queue.put_nowait(city)
            city_queue.task_done()


async def main(args):
    args.dsn = get_dsn(args.dsn)
    terms = [t.strip() for t in args.terms.split(',') if t.strip()]
    cities = [args.city]
    if args.cities:
        cities.extend([c.strip() for c in args.cities.split(',') if c.strip()])
    concurrency = min(args.concurrency, len(cities))
    cols, rows, width, height = compute_layout(concurrency, args.screen_width, args.screen_height)
    slots: Queue = Queue()
    for i in range(concurrency):
        row = i // cols
        col = i % cols
        slots.put_nowait((row, col))
    sem = Semaphore(concurrency)

    city_queue: Queue = Queue()
    for city in cities:
        city_queue.put_nowait(city)

    tasks = [
        worker(city_queue, terms, args, slots, sem, width, height, i)
        for i in range(concurrency)
    ]
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run Google Maps searches across multiple terms and cities"
    )
    parser.add_argument("city", help="City name to search around")
    parser.add_argument("--cities", help="Comma separated list of additional cities")
    parser.add_argument("--terms", required=True, help="Comma separated search terms")
    parser.add_argument("--steps", type=int, default=5)
    parser.add_argument("--spacing-deg", type=float, default=0.02)
    parser.add_argument("--per-grid-total", type=int, default=50)
    parser.add_argument("--dsn", help="Postgres DSN")
    parser.add_argument("--screen-width", type=int, default=1920)
    parser.add_argument("--screen-height", type=int, default=1080)
    parser.add_argument("--concurrency", type=int, default=4, help="Maximum simultaneous scrapers")
    parser.add_argument("--store", choices=["postgres", "cassandra", "sqlite", "csv"], help="Storage backend")
    parser.add_argument("--headless", action="store_true", help="Run browsers headless")
    parser.add_argument("--min-delay", type=float, default=15.0, help="Minimum delay between grid steps")
    parser.add_argument("--max-delay", type=float, default=60.0, help="Maximum delay between grid steps")
    parser.add_argument(
        "--launch-stagger",
        type=float,
        default=0.0,
        help="Seconds between launching each scraper window",
    )
    args = parser.parse_args()

    if args.store:
        os.environ["MAPS_STORAGE"] = args.store

    asyncio.run(main(args))
