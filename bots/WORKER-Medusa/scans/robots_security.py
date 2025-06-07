import requests

def run_test(target):
    """
    Comprehensive Robots and Security.txt Test.

    This test retrieves the robots.txt file and two common security.txt locations:
      - /security.txt
      - /.well-known/security.txt

    It returns a detailed summary including:
      - The URL and HTTP status code for each file.
      - A brief sample of the content (first few lines) if the file is accessible.
      - Error details if a retrieval fails.
    """
    # Normalize target: Default to HTTPS if no scheme is provided.
    if not target.startswith("http://") and not target.startswith("https://"):
        target = "https://" + target
    base_url = target.rstrip("/")

    summary_lines = []
    endpoints = {
        "robots.txt": "/robots.txt",
        "security.txt": "/security.txt",
        "well-known security.txt": "/.well-known/security.txt"
    }

    for label, path in endpoints.items():
        url = base_url + path
        try:
            response = requests.get(url, timeout=10)
            summary_lines.append(f"{label} at {url}: HTTP {response.status_code}")
            if response.status_code == 200:
                # Provide a sample of the content (first 5 lines)
                content_lines = response.text.strip().splitlines()
                sample = "\n".join(content_lines[:5])
                summary_lines.append(f"Sample Content:\n{sample}")
            else:
                summary_lines.append("Content not available or not found.")
        except Exception as e:
            summary_lines.append(f"Error retrieving {label} at {url}: {e}")

    return "\n".join(summary_lines)
