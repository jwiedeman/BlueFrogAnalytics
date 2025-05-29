import gevent.monkey
gevent.monkey.patch_all(thread=False)

import argparse
import logging
import os
import time
import json
import subprocess
from typing import Optional, Dict, Any, List

import cassandra.connection
from cassandra.io import geventreactor
cassandra.connection.Connection = geventreactor.GeventConnection
from cassandra.cluster import Cluster, ExecutionProfile, EXEC_PROFILE_DEFAULT
from cassandra.policies import RoundRobinPolicy, RetryPolicy

from cassandra import Unavailable, OperationTimedOut, WriteTimeout, ReadTimeout  # <-- Added ReadTimeout
from gevent.pool import Pool


def get_lighthouse_path(custom_path: str = "") -> str:
    """Find the Lighthouse CLI executable path."""
    if custom_path and os.path.isfile(custom_path):
        logging.debug(f"Using user-specified Lighthouse path: {custom_path}")  # NEW DEBUG
        return custom_path

    likely_paths = [
        os.path.join(os.getenv('APPDATA', ''), 'npm', 'lighthouse.cmd'),
        os.path.join(os.getenv('LOCALAPPDATA', ''), 'npm', 'lighthouse.cmd'),
        os.path.join(os.getenv('HOME', ''), '.npm-global', 'bin', 'lighthouse'),
        "lighthouse"
    ]

    for path in likely_paths:
        if path and os.path.isfile(path):
            logging.debug(f"Found Lighthouse at: {path}")  # NEW DEBUG
            return path

    raise FileNotFoundError(
        "Could not locate Lighthouse. Install it globally or specify --lighthouse-path."
    )


def run_lighthouse(
    url: str,
    mode: str,
    lighthouse_exe: str,
    extra_flags: List[str],
    timeout_secs: int
) -> Optional[str]:
    """Run Lighthouse and return JSON output as a string."""
    custom_profile_dir = r"C:\lighthouse_profile" if os.name == "nt" else "/tmp/lighthouse_profile"
    chrome_flags_present = any(f == "--chrome-flags" for f in extra_flags)

    if not chrome_flags_present:
        default_flags = [
            "--headless",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            f"--user-data-dir={custom_profile_dir}"
        ]
        extra_flags.extend(["--chrome-flags", " ".join(default_flags)])
        logging.debug(f"Added default Chrome flags for Lighthouse: {default_flags}")  # NEW DEBUG

    cmd = [
        lighthouse_exe,
        url,
        "--output=json",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--disable-storage-reset"
    ]

    if mode == "mobile":
        cmd.extend([
            "--emulated-form-factor=mobile",
            "--screenEmulation.width=375",
            "--screenEmulation.height=667",
            "--screenEmulation.deviceScaleFactor=2",
            "--screenEmulation.mobile"
        ])
        logging.debug("Configured Lighthouse for mobile emulation")  # NEW DEBUG
    else:
        cmd.append("--preset=desktop")
        logging.debug("Configured Lighthouse for desktop preset")  # NEW DEBUG

    cmd.extend(extra_flags)
    logging.debug(f"Running Lighthouse command: {' '.join(cmd)}")

    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
            timeout=timeout_secs
        )
        logging.debug(f"Lighthouse command completed: returncode={proc.returncode}")  # NEW DEBUG
        time.sleep(2)  # Allow OS to release file locks
        return proc.stdout
    except subprocess.TimeoutExpired as e:
        logging.error(f"Lighthouse timeout for {url} ({mode}): {e.stderr}")
        return None
    except subprocess.CalledProcessError as e:
        logging.error(f"Lighthouse error for {url} ({mode}): {e.stderr}")
        return None


def extract_detailed_data(json_data: str, mode: str) -> Dict[str, Any]:
    """Parse Lighthouse JSON output into metrics."""
    try:
        data = json.loads(json_data)
        logging.debug(f"Parsing JSON data for mode: {mode}")  # NEW DEBUG
        categories = data.get('categories', {})
        audits = data.get('audits', {})

        return {
            'mode': mode,
            'url': data.get('finalDisplayedUrl', ''),
            'requested_url': data.get('requestedUrl', ''),
            'lighthouse_version': data.get('lighthouseVersion', ''),
            'fetch_time': data.get('fetchTime', ''),
            'performance_score': categories.get('performance', {}).get('score'),
            'accessibility_score': categories.get('accessibility', {}).get('score'),
            'best_practices_score': categories.get('best-practices', {}).get('score'),
            'seo_score': categories.get('seo', {}).get('score'),
            'first_contentful_paint': audits.get('first-contentful-paint', {}).get('numericValue', 0),
            'largest_contentful_paint': audits.get('largest-contentful-paint', {}).get('numericValue', 0),
            'interactive': audits.get('interactive', {}).get('numericValue', 0),
            'speed_index': audits.get('speed-index', {}).get('numericValue', 0),
            'total_blocking_time': audits.get('total-blocking-time', {}).get('numericValue', 0),
            'cumulative_layout_shift': audits.get('cumulative-layout-shift', {}).get('numericValue', 0),
            'timing_total': data.get('timing', {}).get('total', 0)
        }
    except Exception as e:
        logging.error(f"Failed to parse Lighthouse data: {e}")
        return {}


def safe_execute(session, query, params):
    """Retry Cassandra operations on transient errors."""
    delay = 5
    attempt = 1  # NEW DEBUG
    while True:
        try:
            logging.debug(f"Attempt {attempt}: Executing query with parameters: {params}")  # NEW DEBUG
            return session.execute(query, params)
        except (OperationTimedOut, Unavailable, WriteTimeout, ReadTimeout) as e:
            logging.warning(f"Database error ({e.__class__.__name__}): {e}. Retrying in {delay}s...")
            time.sleep(delay)
            delay = min(delay * 2, 60)
            attempt += 1  # NEW DEBUG


def process_domain(
    session,
    update_stmt,
    lighthouse_exe: str,
    extra_flags: List[str],
    disable_mobile: bool,
    timeout_secs: int,
    domain: str,
    tld: str
):
    """Process a single domain with Lighthouse and update the database."""
    full_domain = f"{domain}.{tld}"
    homepage_url = f"http://{full_domain}"
    logging.info(f"Processing {homepage_url}")

    desktop_data = {}
    mobile_data = {}

    # Run Lighthouse Desktop
    logging.debug(f"Starting Desktop Lighthouse audit for {full_domain}")  # NEW DEBUG
    desktop_json = run_lighthouse(homepage_url, "desktop", lighthouse_exe, extra_flags, timeout_secs)
    if desktop_json:
        logging.debug(f"Desktop audit succeeded for {full_domain}")  # NEW DEBUG
        desktop_data = extract_detailed_data(desktop_json, "desktop")
    else:
        logging.error(f"Desktop audit failed for {full_domain}")

    # Run Lighthouse Mobile if enabled
    if not disable_mobile:
        logging.debug(f"Starting Mobile Lighthouse audit for {full_domain}")  # NEW DEBUG
        mobile_json = run_lighthouse(homepage_url, "mobile", lighthouse_exe, extra_flags, timeout_secs)
        if mobile_json:
            logging.debug(f"Mobile audit succeeded for {full_domain}")  # NEW DEBUG
            mobile_data = extract_detailed_data(mobile_json, "mobile")
        else:
            logging.error(f"Mobile audit failed for {full_domain}")

    # Prepare parameters for the database update
    params = (
        desktop_data.get('performance_score'),
        desktop_data.get('accessibility_score'),
        desktop_data.get('best_practices_score'),
        desktop_data.get('seo_score'),
        int(desktop_data.get('first_contentful_paint', 0)),
        int(desktop_data.get('largest_contentful_paint', 0)),
        int(desktop_data.get('interactive', 0)),
        int(desktop_data.get('speed_index', 0)),
        int(desktop_data.get('total_blocking_time', 0)),
        float(desktop_data.get('cumulative_layout_shift', 0)),
        int(desktop_data.get('timing_total', 0)),
        mobile_data.get('performance_score'),
        mobile_data.get('accessibility_score'),
        mobile_data.get('best_practices_score'),
        mobile_data.get('seo_score'),
        int(mobile_data.get('first_contentful_paint', 0)),
        int(mobile_data.get('largest_contentful_paint', 0)),
        int(mobile_data.get('interactive', 0)),
        int(mobile_data.get('speed_index', 0)),
        int(mobile_data.get('total_blocking_time', 0)),
        float(mobile_data.get('cumulative_layout_shift', 0)),
        int(mobile_data.get('timing_total', 0)),
        desktop_data.get('lighthouse_version') or mobile_data.get('lighthouse_version', ''),
        desktop_data.get('fetch_time') or mobile_data.get('fetch_time', ''),
        desktop_data.get('url') or mobile_data.get('url', ''),
        domain,
        tld
    )

    logging.debug(f"Updating database for {full_domain} with params: {params}")  # NEW DEBUG
    safe_execute(session, update_stmt, params)
    logging.info(f"Updated database for {full_domain}")


def main():
    parser = argparse.ArgumentParser(description='Enrich domains with Lighthouse metrics.')
    parser.add_argument('--lighthouse-path', default='', help='Path to Lighthouse CLI')
    parser.add_argument('--disable-mobile', action='store_true', help='Disable mobile audits')
    parser.add_argument('--per-url-timeout', type=int, default=120, help='Timeout per audit in seconds')
    parser.add_argument('--concurrency', type=int, default=50, help='Number of concurrent audits')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    args, unknown_flags = parser.parse_known_args()

    logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO)
    if args.debug:
        logging.debug("Debug logging is enabled.")

    # Create your execution profile
    profile = ExecutionProfile(
        load_balancing_policy=RoundRobinPolicy(),
        retry_policy=RetryPolicy(),
        request_timeout=120  # e.g., 120s
    )

    cluster = Cluster(
        contact_points=["192.168.1.201", "192.168.1.202", 
                        "192.168.1.203", "192.168.1.204"],
        execution_profiles={EXEC_PROFILE_DEFAULT: profile},
        # These are still fine to keep at the Cluster level
        connect_timeout=60,
        idle_heartbeat_timeout=60,
        protocol_version=4
    )
    session = cluster.connect("domain_discovery")
    logging.debug("Connected to Cassandra cluster and keyspace domain_discovery")  # NEW DEBUG

    # Prepared statement for updating metrics
    update_query = """
        UPDATE domain_discovery.domains_processed SET
            desktop_performance_score = ?,
            desktop_accessibility_score = ?,
            desktop_best_practices_score = ?,
            desktop_seo_score = ?,
            desktop_first_contentful_paint = ?,
            desktop_largest_contentful_paint = ?,
            desktop_interactive = ?,
            desktop_speed_index = ?,
            desktop_total_blocking_time = ?,
            desktop_cumulative_layout_shift = ?,
            desktop_timing_total = ?,
            mobile_performance_score = ?,
            mobile_accessibility_score = ?,
            mobile_best_practices_score = ?,
            mobile_seo_score = ?,
            mobile_first_contentful_paint = ?,
            mobile_largest_contentful_paint = ?,
            mobile_interactive = ?,
            mobile_speed_index = ?,
            mobile_total_blocking_time = ?,
            mobile_cumulative_layout_shift = ?,
            mobile_timing_total = ?,
            lighthouse_version = ?,
            lighthouse_fetch_time = ?,
            lighthouse_url = ?
        WHERE domain = ? AND tld = ?
    """
    update_stmt = session.prepare(update_query)
    logging.debug("Prepared statement for domain updates created")  # NEW DEBUG

    # Fetch all domains to process
    logging.debug("Fetching rows from domains_processed table")  # NEW DEBUG
    rows = session.execute("SELECT domain, tld FROM domains_processed")
    rows_list = list(rows)  # Grab all rows if you like, to log the total
    logging.info(f"Fetched {len(rows_list)} rows to process.")  # NEW DEBUG

    pool = Pool(args.concurrency)
    logging.debug(f"Initialized gevent pool with concurrency={args.concurrency}")  # NEW DEBUG
    lighthouse_exe = get_lighthouse_path(args.lighthouse_path)
    logging.debug(f"Using Lighthouse executable at: {lighthouse_exe}")  # NEW DEBUG

    # Spawn greenlets for concurrent processing
    for row in rows_list:
        pool.spawn(
            process_domain,
            session=session,
            update_stmt=update_stmt,
            lighthouse_exe=lighthouse_exe,
            extra_flags=unknown_flags,
            disable_mobile=args.disable_mobile,
            timeout_secs=args.per_url_timeout,
            domain=row.domain,
            tld=row.tld
        )

    pool.join()
    logging.debug("All tasks in pool have completed")  # NEW DEBUG
    cluster.shutdown()
    logging.debug("Cassandra cluster connection shut down")  # NEW DEBUG


if __name__ == "__main__":
    main()
