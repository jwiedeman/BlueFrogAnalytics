import json
from enrichment import extract_contact_details


def run_test(html_snippet=""):
    """Return contact details extracted from the given HTML snippet."""
    if not html_snippet:
        html_snippet = (
            "<html><body>"
            "<a href='mailto:info@example.com'>Email</a>"
            "<a href='tel:123-456-7890'>Call</a>"
            "<a href='sms:1234567890'>SMS</a>"
            "<address>123 Main St, Townsville, TX 12345</address>"
            "</body></html>"
        )
    details = extract_contact_details(html_snippet)
    return json.dumps(details)
