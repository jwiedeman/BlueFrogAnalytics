import json
import random


def run_test(query, location="US"):
    """Return fake Google Maps business info for the query."""
    data = {
        "name": f"{query} Example",
        "address": f"1 Example Rd, {location}",
        "website": "http://example.com",
        "phone": "555-1234",
        "reviews_average": round(random.uniform(1.0, 5.0), 2),
        "query": query,
        "latitude": round(random.uniform(-90, 90), 6),
        "longitude": round(random.uniform(-180, 180), 6)
    }
    return json.dumps(data)
