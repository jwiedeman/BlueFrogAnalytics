import time
import random
import json
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.common.exceptions import StaleElementReferenceException

# File where unique /company/ links will be stored.
OUTPUT_FILE = "company_links.txt"
# File to store cookies
COOKIES_FILE = "cookies.json"

# Function to save cookies to a file
def save_cookies(driver):
    cookies = driver.get_cookies()
    with open(COOKIES_FILE, "w", encoding="utf-8") as f:
        json.dump(cookies, f)
    print("Cookies saved.")

# Function to load cookies from a file
def load_cookies(driver):
    try:
        with open(COOKIES_FILE, "r", encoding="utf-8") as f:
            cookies = json.load(f)
        for cookie in cookies:
            driver.add_cookie(cookie)
        print("Cookies loaded.")
    except FileNotFoundError:
        print("No cookies file found. Proceeding without loading cookies.")

# Function to extract and save company links
def extract_and_save_links(driver, found_urls):
    try:
        # Grab all <a> tags containing "/company/"
        anchors = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/company/"]')
        
        # Check for new matching links
        new_links = []
        for anchor in anchors:
            try:
                href = anchor.get_attribute("href")
                # Only keep canonical company URLs (filtering out irrelevant paths)
                if href and "/company/" in href:
                    # Use regex to extract clean company URLs (no query params, anchors, etc.)
                    match = re.match(r'(https?://[^/]+/company/[^/?#]+)', href)
                    if match:
                        clean_url = match.group(1)
                        if clean_url not in found_urls:
                            found_urls.add(clean_url)
                            new_links.append(clean_url)
            except StaleElementReferenceException:
                continue
        
        # If we found any new links, append them to the file
        if new_links:
            with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
                for link in new_links:
                    f.write(link + "\n")
            print(f"Found {len(new_links)} new link(s). Total unique links: {len(found_urls)}. Saved to file.")
        
        return len(new_links)
    except Exception as e:
        print(f"Error extracting links: {e}")
        return 0

# Function to toggle pagination
def toggle_pagination(driver, found_urls, max_pages=10):
    try:
        page_count = 0
        while page_count < max_pages:
            # Extract links on current page
            new_links_count = extract_and_save_links(driver, found_urls)
            print(f"Scraped page {page_count + 1}, found {new_links_count} new links")
            
            # Find the "Next" button
            next_button = driver.find_elements(By.CSS_SELECTOR, 'button[aria-label="Next"]')
            if not next_button or not next_button[0].is_enabled() or "disabled" in next_button[0].get_attribute("class"):
                print("No more pages to paginate.")
                break

            # Click the "Next" button
            next_button[0].click()
            print("Clicked 'Next' button.")

            # Wait for a random delay between 2 and 8 seconds
            delay = random.randint(2, 8)
            print(f"Waiting for {delay} seconds before next page...")
            time.sleep(delay)
            
            page_count += 1

        print(f"Pagination complete. Processed {page_count + 1} pages.")
    except Exception as e:
        print(f"Error during pagination: {e}")

def main():
    # Set up Chrome driver with a persistent profile
    options = webdriver.ChromeOptions()
    options.add_argument("--user-data-dir=C:\\Users\\Palantir\\AppData\\Local\\Google\\Chrome\\User Data\\Default")
    service = Service("C:\\Program Files\\Google\\Chrome\\Application\\chromedriver.exe")
    driver = webdriver.Chrome(service=service, options=options)

    # Make window visible
    driver.maximize_window()

    # Navigate to LinkedIn
    driver.get("https://www.linkedin.com")
    print("Browser launched and navigated to LinkedIn.")

    # Load cookies if they exist
    load_cookies(driver)

    # Refresh the page to apply cookies
    driver.get("https://www.linkedin.com")

    # Initialize a set for tracking found URLs
    found_urls = set()

    # If there's an existing file, load previously saved URLs
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                found_urls.add(line.strip())
        print(f"Loaded {len(found_urls)} previously saved links.")
    except FileNotFoundError:
        print("No existing links file. Creating a new one.")
        # Create an empty file
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            pass

    try:
        while True:
            print("\n=== LinkedIn Scraper Menu ===")
            print("1. Manually navigate to a new page and extract links")
            print("2. Auto-paginate and extract links from current page")
            print("3. Just extract links from current page")
            print("q. Quit")
            
            user_input = input("Enter your choice: ").strip().lower()
            
            if user_input == '1':
                print("Manually navigate to your desired LinkedIn page...")
                input("Press Enter when you're ready to extract links from the current page...")
                extract_and_save_links(driver, found_urls)
                
            elif user_input == '2':
                max_pages = int(input("Enter maximum number of pages to scrape (default: 10): ") or 10)
                print(f"Starting auto-pagination for up to {max_pages} pages...")
                toggle_pagination(driver, found_urls, max_pages)
                
            elif user_input == '3':
                extract_and_save_links(driver, found_urls)
                
            elif user_input == 'q':
                print("Exiting script. Goodbye, Commander!")
                break
                
            else:
                print("Invalid option. Please try again.")

    except KeyboardInterrupt:
        print("\nExiting script. Goodbye, Commander!")
    finally:
        # Save cookies before quitting
        save_cookies(driver)
        driver.quit()

if __name__ == "__main__":
    main()