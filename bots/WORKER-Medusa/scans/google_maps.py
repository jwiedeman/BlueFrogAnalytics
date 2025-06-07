"""Google Maps business lookup using the Places API."""

import json
import os
import time
from typing import Dict, Generator

import requests


API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")


def _fetch_details(place_id: str) -> Dict[str, str]:
    """Return phone number and website for the given place ID."""
    if not API_KEY:
        return {"phone": "", "website": ""}
    detail_url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "formatted_phone_number,website",
        "key": API_KEY,
    }
    resp = requests.get(detail_url, params=params, timeout=10)
    if not resp.ok:
        return {"phone": "", "website": ""}
    info = resp.json().get("result", {})
    return {
        "phone": info.get("formatted_phone_number", ""),
        "website": info.get("website", ""),
    }


def _search(term: str, location: str) -> Generator[Dict[str, str], None, None]:
    """Yield place info from the Places text search API."""
    if not API_KEY:
        raise RuntimeError("GOOGLE_MAPS_API_KEY environment variable not set")

    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {"query": f"{term} {location}", "key": API_KEY}
    next_token = None
    while True:
        if next_token:
            params = {"pagetoken": next_token, "key": API_KEY}
            # Google requires a short delay before requesting the next page
            time.sleep(2)
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        for result in data.get("results", []):
            details = _fetch_details(result.get("place_id", ""))
            yield {
                "name": result.get("name", ""),
                "address": result.get("formatted_address", ""),
                "website": details.get("website", ""),
                "phone": details.get("phone", ""),
                "reviews_average": result.get("rating"),
                "query": term,
                "latitude": result.get("geometry", {})
                .get("location", {})
                .get("lat"),
                "longitude": result.get("geometry", {})
                .get("location", {})
                .get("lng"),
            }
        next_token = data.get("next_page_token")
        if not next_token:
            break


def run_test(query: str, location: str = "US") -> str:
    """Return JSON list of businesses matching the query and location."""
    results = list(_search(query, location))
    return json.dumps(results)
