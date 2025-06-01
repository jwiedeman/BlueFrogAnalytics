import argparse
import asyncio
import math
import random
from pathlib import Path

from grid_worker import scrape_city_grid



def compute_layout(n: int, screen_w: int, screen_h: int) -> tuple[int, int, int, int]:
    cols = int(math.sqrt(n))
    if cols * cols < n:
        cols += 1
    rows = (n + cols - 1) // cols
    width = max(300, screen_w // cols)
    height = max(300, screen_h // rows)
    return cols, rows, width, height


async def run_term(term: str, args, index: int, cols: int, width: int, height: int):
    row = index // cols
    col = index % cols
    x = col * width
    y = row * height
    launch_args = [
        f"--window-size={width},{height}",
        f"--window-position={x},{y}",
    ]
    out_csv = Path(args.output)
    await scrape_city_grid(
        args.city,
        term,
        args.steps,
        args.spacing,
        args.total,
        out_csv,
        headless=args.headless,
        min_delay=args.min_delay,
        max_delay=args.max_delay,
        launch_args=launch_args,
    )


async def main(args):
    terms = [t.strip() for t in args.terms.split(',') if t.strip()]
    random.shuffle(terms)
    cols, rows, width, height = compute_layout(len(terms), args.screen_width, args.screen_height)
    tasks = [run_term(term, args, i, cols, width, height) for i, term in enumerate(terms)]
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
    parser.add_argument(
        "--output",
        default="output/results.csv",
        help="Path to shared CSV output file",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run browsers headless (default is windowed)",
    )
    parser.add_argument("--screen-width", type=int, default=1920)
    parser.add_argument("--screen-height", type=int, default=1080)
    parser.add_argument("--min-delay", type=float, default=1.0)
    parser.add_argument("--max-delay", type=float, default=3.0)

    args = parser.parse_args()
    Path(Path(args.output).parent).mkdir(parents=True, exist_ok=True)

    asyncio.run(main(args))
