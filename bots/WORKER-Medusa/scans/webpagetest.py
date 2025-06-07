import requests
import time
import logging


def run_test(target, api_key=None, verbose=True):
    """Run WebPageTest for the given URL and return key metrics."""
    logging.basicConfig(level=logging.DEBUG if verbose else logging.INFO,
                        format="%(asctime)s - %(levelname)s - %(message)s")
    api_key = api_key or "A"
    params = {"url": target, "f": "json", "k": api_key}
    try:
        resp = requests.get("https://www.webpagetest.org/runtest.php",
                            params=params, timeout=30)
        resp.raise_for_status()
        info = resp.json().get("data", {})
        status_url = info.get("jsonUrl")
        if not status_url:
            return "WebPageTest did not return a status URL"
        for _ in range(30):
            time.sleep(10)
            status = requests.get(status_url, timeout=30).json()
            if status.get("statusCode") == 200:
                break
        result = status.get("data", {}).get("average", {}).get("firstView", {})
        summary = (
            f"Load Time: {result.get('loadTime')}ms\n"
            f"Speed Index: {result.get('SpeedIndex')}\n"
            f"TTFB: {result.get('TTFB')}"
        )
        return summary
    except Exception as e:  # pragma: no cover - network issues
        return f"WebPageTest error: {e}"
