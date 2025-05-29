import os
import psycopg2
from psycopg2.extras import execute_values
from Wappalyzer import Wappalyzer, WebPage
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import json
import time

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Database connection with thread-local storage
thread_local = threading.local()

def get_db_connection():
    if not hasattr(thread_local, "conn"):
        thread_local.conn = psycopg2.connect(DATABASE_URL)
    return thread_local.conn

# Check and reset "in-progress" domains
def reset_in_progress_domains():
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE domains
                SET techdetect = NULL
                WHERE techdetect::jsonb @> '{"status": "in-progress"}'
                AND domain NOT IN (
                    SELECT domain
                    FROM domains
                    WHERE techdetect::jsonb @> '{"status": "in-progress"}'
                );
                """
            )
            conn.commit()
            print("Reset orphaned in-progress domains to NULL.")
    except Exception as e:
        print(f"Error resetting in-progress domains: {e}")

# Fetch a single domain to analyze
def fetch_domain():
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE domains
                SET techdetect = '{"status": "in-progress"}'
                WHERE domain = (
                    SELECT domain FROM domains WHERE status = 1 AND techdetect IS NULL LIMIT 1 FOR UPDATE SKIP LOCKED
                )
                RETURNING domain;
                """
            )
            result = cur.fetchone()
            if result:
                return result[0]
    except Exception as e:
        print(f"Error fetching domain: {e}")
    return None

# Analyze site with Wappalyzer
def analyze_site(url):
    try:
        wappalyzer = Wappalyzer.latest()
        webpage = WebPage.new_from_url(url)
        result = wappalyzer.analyze_with_versions_and_categories(webpage)
        return result
    except Exception as e:
        print(f"Error analyzing {url}: {e}")
        return None

# Update the database with a single domain result
def update_techdetect(domain, tech_info):
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE domains
                SET techdetect = %s
                WHERE domain = %s;
                """,
                [json.dumps(tech_info), domain]  # Serialize tech_info to JSON
            )
            conn.commit()
    except Exception as e:
        print(f"Error updating database for {domain}: {e}")

# Mark a domain as unreachable
def mark_unreachable(domain):
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE domains
                SET techdetect = '{"status": "unreachable"}'
                WHERE domain = %s;
                """,
                [domain]
            )
            conn.commit()
    except Exception as e:
        print(f"Error marking {domain} as unreachable: {e}")

# Worker function to analyze a single domain
def worker():
    while True:
        domain = fetch_domain()
        if not domain:
            break

       
        tech_info = analyze_site(f"http://{domain}")
        if tech_info:
            update_techdetect(domain, tech_info)

            # Check for specific keywords and highlight if found
            highlight_keywords = ["shopify", "google ads", "wordpress"]
            tech_info_str = json.dumps(tech_info).lower()
            if any(keyword in tech_info_str for keyword in highlight_keywords):
                print(f"\033[92mFinished analyzing {domain}: {tech_info}\033[0m")  # Bright green text
            else:
                print(f"Finished analyzing {domain}: {tech_info}")
        else:
            print(f"No tech info found for {domain}. Marking as unreachable.")
            mark_unreachable(domain)

# Function to display progress
def display_progress():
    try:
        conn = get_db_connection()
        while True:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN techdetect IS NULL THEN 1 ELSE 0 END) AS unresolved,
                        SUM(CASE WHEN techdetect IS NOT NULL THEN 1 ELSE 0 END) AS resolved,
                        SUM(CASE WHEN techdetect::jsonb @> '{"status": "in-progress"}' THEN 1 ELSE 0 END) AS in_progress,
                        SUM(CASE WHEN techdetect::jsonb @> '{"status": "unreachable"}' THEN 1 ELSE 0 END) AS unreachable
                    FROM domains;
                    """
                )
                result = cur.fetchone()
                total, unresolved, resolved, in_progress, unreachable = result

                os.system('clear')  # Clear the console every update
                print(f"\nProgress Report:")
                print(f"Total Domains: {total}")
                print(f"Resolved Domains: {resolved}")
                print(f"Unresolved Domains: {unresolved}")
                print(f"In Progress: {in_progress}")
                print(f"Unreachable: {unreachable}")

            time.sleep(120)  # Update every 15 seconds
    except Exception as e:
        print(f"Error fetching progress: {e}")

# Main function
def main():
    max_threads = 1000  # Adjust the number of threads based on your environment
    print("Starting analysis with multithreading...")

    # Reset orphaned in-progress domains before starting
    reset_in_progress_domains()

    # Start the progress display in a separate thread
    progress_thread = threading.Thread(target=display_progress, daemon=True)
    progress_thread.start()

    with ThreadPoolExecutor(max_threads) as executor:
        futures = [executor.submit(worker) for _ in range(max_threads)]
        for future in as_completed(futures):
            future.result()  # Wait for all threads to complete

    print("All domains processed.")

if __name__ == "__main__":
    main()