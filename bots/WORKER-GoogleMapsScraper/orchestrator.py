import argparse
import asyncio
import math
import random

from asyncio import Semaphore, Queue

from grid_worker import scrape_city_grid
from db import get_dsn
import os



def compute_layout(n: int, screen_w: int, screen_h: int) -> tuple[int, int, int, int]:
    cols = int(math.sqrt(n))
    if cols * cols < n:
        cols += 1
    rows = (n + cols - 1) // cols
    width = max(300, screen_w // cols)
    height = max(300, screen_h // rows)
    return cols, rows, width, height


async def run_term(city: str, term: str, args, slots: Queue, sem: Semaphore, width: int, height: int):
    async with sem:
        row, col = await slots.get()
        x = col * width
        y = row * height
        launch_args = [
            f"--window-size={width},{height}",
            f"--window-position={x},{y}",
        ]
        try:
            await scrape_city_grid(
                city,
                term,
                args.steps,
                args.spacing,
                args.total,
                get_dsn(args.dsn),
                headless=args.headless,
                min_delay=args.min_delay,
                max_delay=args.max_delay,
                launch_args=launch_args,
            )
        finally:
            slots.put_nowait((row, col))


async def run_term_with_delay(city: str, term: str, args, slots: Queue, sem: Semaphore, width: int, height: int, delay: float):
    if delay > 0:
        await asyncio.sleep(delay)
    await run_term(city, term, args, slots, sem, width, height)


async def worker(term_queue: Queue, args, slots: Queue, sem: Semaphore, width: int, height: int, index: int):
    delay = index * args.launch_stagger
    if delay > 0:
        await asyncio.sleep(delay)
    while True:
        try:
            city, term = term_queue.get_nowait()
        except asyncio.QueueEmpty:
            return
        try:
            await run_term(city, term, args, slots, sem, width, height)
        except Exception as e:
            print(f"Error processing term '{term}': {e}")
        finally:
            term_queue.task_done()


async def main(args):
    args.dsn = get_dsn(args.dsn)
    terms = [t.strip() for t in args.terms.split(',') if t.strip()]
    cities = [args.city]
    if args.cities:
        cities = [c.strip() for c in args.cities.split(',') if c.strip()]
    pairs = [(city, term) for city in cities for term in terms]
    random.shuffle(pairs)
    concurrency = min(args.concurrency, len(pairs))
    cols, rows, width, height = compute_layout(concurrency, args.screen_width, args.screen_height)
    slots: Queue = Queue()
    for i in range(concurrency):
        row = i // cols
        col = i % cols
        slots.put_nowait((row, col))
    sem = Semaphore(concurrency)

    term_queue: Queue = Queue()
    for pair in pairs:
        term_queue.put_nowait(pair)

    tasks = [
        worker(term_queue, args, slots, sem, width, height, i)
        for i in range(concurrency)
    ]
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run Google Maps grid scraping for multiple search terms"
    )
    parser.add_argument("city", help="City name to search around")
    parser.add_argument("--cities", help="Comma separated list of cities to search")
    parser.add_argument("--terms", required=True, help="Comma separated search terms")
    parser.add_argument("--steps", type=int, default=1)
    parser.add_argument("--spacing", type=float, default=0.02)
    parser.add_argument("--total", type=int, default=50)
    parser.add_argument("--dsn", help="Postgres DSN")
    parser.add_argument("--screen-width", type=int, default=1920)
    parser.add_argument("--screen-height", type=int, default=1080)
    parser.add_argument("--min-delay", type=float, default=1.0)
    parser.add_argument("--max-delay", type=float, default=3.0)
    parser.add_argument("--concurrency", type=int, default=4, help="Maximum simultaneous scrapers")
    parser.add_argument("--store", choices=["postgres", "cassandra", "sqlite", "csv"], help="Storage backend")
    parser.add_argument("--headless", action="store_true", help="Run browsers headless")
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
