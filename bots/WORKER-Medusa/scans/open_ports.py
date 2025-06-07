import socket
import logging

def run_test(target, verbose=True):
    """
    Passive Open Ports Test with Verbose Logging.

    This test performs a minimal and passive check on a set of common ports for the provided target.
    It attempts to establish a TCP connection to each port, indicating whether the port is open.
    The primary focus is to determine if the target is an actual web server (commonly on ports 80, 443, 8080)
    and to gather basic connectivity info. This is strictly legal recon and should only be used on authorized targets.

    Args:
        target (str): The target domain or IP. URL schemes (http://, https://) are stripped if present.
        verbose (bool): If True, enables detailed logging.

    Returns:
        str: A detailed summary of open ports found on the target.
    """
    # Configure logging based on the verbose flag.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    logging.debug("Starting Passive Open Ports Test.")

    # Normalize target: remove URL scheme if present, then extract hostname.
    if target.startswith("http://"):
        logging.debug("Stripping 'http://' from target.")
        target = target[len("http://"):]
    elif target.startswith("https://"):
        logging.debug("Stripping 'https://' from target.")
        target = target[len("https://"):]
    hostname = target.split("/")[0]
    logging.debug("Extracted hostname: %s", hostname)

    # Define a set of common ports with descriptions.
    common_ports = {
        80: "HTTP",
        443: "HTTPS",
        8080: "Alternate HTTP",
        22: "SSH",
        21: "FTP",
    }

    summary_lines = [f"Passive Open Ports Test for {hostname}:"]
    open_ports = []

    for port, description in common_ports.items():
        logging.debug("Testing port %d (%s)", port, description)
        try:
            # Attempt to create a connection with a short timeout.
            with socket.create_connection((hostname, port), timeout=3):
                logging.debug("Port %d (%s) is open.", port, description)
                summary_lines.append(f"Port {port} ({description}): OPEN")
                open_ports.append(port)
        except Exception as e:
            logging.debug("Port %d (%s) is closed or filtered: %s", port, description, e)
            summary_lines.append(f"Port {port} ({description}): Closed or filtered")

    # Check if any common web ports appear to be open.
    web_ports = {80, 443, 8080}
    if not web_ports.intersection(open_ports):
        logging.debug("No common web server ports (80, 443, 8080) are open.")
        summary_lines.append("No common web server ports (80, 443, 8080) appear to be open.")

    logging.info("Passive Open Ports Test completed.")
    return "\n".join(summary_lines)
