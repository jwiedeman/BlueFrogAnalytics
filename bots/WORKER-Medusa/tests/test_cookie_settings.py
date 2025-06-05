import requests
import logging

def run_test(target, verbose=True):
    """
    Comprehensive Cookie Settings Test with Verbose Logging.
    
    This test retrieves the target website and analyzes the Set-Cookie headers to check for
    secure cookie flags such as HttpOnly, Secure, and SameSite. It returns a detailed summary
    for each cookie, including the cookie name, its value (truncated for brevity), and whether
    each security attribute is set.
    
    Verbose logging is enabled by default and logs detailed steps during the process.
    
    Args:
        target (str): The target domain or URL.
        verbose (bool): If True, enables detailed logging.
        
    Returns:
        str: A detailed summary of the cookie settings analysis.
    """
    # Configure logging based on the verbose flag.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    
    logging.debug("Starting Cookie Settings Test.")
    
    # Normalize target: add scheme if missing.
    if not target.startswith("http://") and not target.startswith("https://"):
        logging.debug("No scheme provided; defaulting to HTTPS.")
        target = "https://" + target

    logging.debug("Normalized target: %s", target)
    summary_lines = [f"Cookie Settings Test for {target}:"]

    try:
        logging.debug("Sending GET request to %s", target)
        response = requests.get(target, timeout=10)
        logging.debug("Received response with status code: %d", response.status_code)
    except Exception as e:
        logging.error("Failed to retrieve webpage from %s: %s", target, e)
        return f"Failed to retrieve webpage from {target}: {e}"

    # Retrieve all Set-Cookie headers. Use response.raw.headers.getlist if available.
    set_cookie_headers = []
    if hasattr(response.raw, 'headers') and hasattr(response.raw.headers, 'getlist'):
        set_cookie_headers = response.raw.headers.getlist('Set-Cookie')
        logging.debug("Retrieved Set-Cookie headers using response.raw.headers.getlist.")
    else:
        cookie_header = response.headers.get("Set-Cookie")
        if cookie_header:
            set_cookie_headers = [cookie_header]
            logging.debug("Retrieved Set-Cookie header from response.headers.")

    if not set_cookie_headers:
        logging.info("No Set-Cookie headers found.")
        summary_lines.append("No Set-Cookie headers found.")
        return "\n".join(summary_lines)

    for cookie_header in set_cookie_headers:
        logging.debug("Analyzing cookie header: %s", cookie_header)
        # Split the cookie header by semicolon to extract components.
        parts = cookie_header.split(";")
        if not parts:
            logging.debug("Skipping empty cookie header parts.")
            continue
        # The first part contains the cookie name and value.
        name_value = parts[0].strip()
        if "=" in name_value:
            cookie_name, cookie_value = name_value.split("=", 1)
            cookie_name = cookie_name.strip()
            cookie_value = cookie_value.strip()
        else:
            cookie_name = name_value
            cookie_value = ""
        logging.debug("Cookie name: %s, Cookie value: %s", cookie_name, cookie_value)
        
        # Initialize flags.
        flags = {"Secure": False, "HttpOnly": False, "SameSite": None}
        for part in parts[1:]:
            part = part.strip()
            if part.lower() == "secure":
                flags["Secure"] = True
            elif part.lower() == "httponly":
                flags["HttpOnly"] = True
            elif part.lower().startswith("samesite"):
                tokens = part.split("=", 1)
                if len(tokens) == 2:
                    flags["SameSite"] = tokens[1].strip()
                else:
                    flags["SameSite"] = "Not specified"
        logging.debug("Flags for cookie '%s': %s", cookie_name, flags)

        summary_lines.append(f"Cookie: {cookie_name}")
        summary_lines.append(f" - Value (truncated): {cookie_value[:20]}{'...' if len(cookie_value) > 20 else ''}")
        summary_lines.append(f" - Secure: {'Yes' if flags['Secure'] else 'No'}")
        summary_lines.append(f" - HttpOnly: {'Yes' if flags['HttpOnly'] else 'No'}")
        summary_lines.append(f" - SameSite: {flags['SameSite'] if flags['SameSite'] is not None else 'Not set'}")

    logging.info("Cookie Settings Test completed.")
    return "\n".join(summary_lines)
