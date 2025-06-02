import argparse
import asyncio
import math
import random

from asyncio import Semaphore, Queue

from grid_worker import scrape_city_grid



def compute_layout(n: int, screen_w: int, screen_h: int) -> tuple[int, int, int, int]:
    cols = int(math.sqrt(n))
    if cols * cols < n:
        cols += 1
    rows = (n + cols - 1) // cols
    width = max(300, screen_w // cols)
    height = max(300, screen_h // rows)
    return cols, rows, width, height


async def run_term(term: str, args, slots: Queue, sem: Semaphore, width: int, height: int):
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
                args.city,
                term,
                args.steps,
                args.spacing,
                args.total,
                args.dsn,
                headless=args.headless,
                min_delay=args.min_delay,
                max_delay=args.max_delay,
                launch_args=launch_args,
            )
        finally:
            slots.put_nowait((row, col))


async def main(args):
    terms = [t.strip() for t in args.terms.split(',') if t.strip()]
    random.shuffle(terms)
    concurrency = min(args.concurrency, len(terms))
    cols, rows, width, height = compute_layout(concurrency, args.screen_width, args.screen_height)
    slots: Queue = Queue()
    for i in range(concurrency):
        row = i // cols
        col = i % cols
        slots.put_nowait((row, col))
    sem = Semaphore(concurrency)
    tasks = [run_term(term, args, slots, sem, width, height) for term in terms]
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run Google Maps grid scraping for multiple search terms"
    )
    parser.add_argument("city", help="City name to search around")
    parser.add_argument("--terms", required=True, help="Comma separated search terms")
    parser.add_argument("--steps", type=int, default=1)
    parser.add_argument("--spacing", type=float, default=0.02)
    parser.add_argument("--total", type=int, default=50)
    parser.add_argument("--dsn", required=True, help="Postgres DSN")
    parser.add_argument("--screen-width", type=int, default=1920)
    parser.add_argument("--screen-height", type=int, default=1080)
    parser.add_argument("--min-delay", type=float, default=1.0)
    parser.add_argument("--max-delay", type=float, default=3.0)
    parser.add_argument("--concurrency", type=int, default=4, help="Maximum simultaneous scrapers")

    parser.add_argument("--headless", action="store_true", help="Run browsers headless")
    args = parser.parse_args()
    
    asyncio.run(main(args))
