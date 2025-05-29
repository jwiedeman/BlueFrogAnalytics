import os
import json
import csv
import sys
try:
    from openpyxl import Workbook
except ImportError:
    print("openpyxl is required to output Excel files. Please install it: pip install openpyxl")
    sys.exit(1)
from dataclasses import dataclass, field
from typing import List

from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

import openai

# Set your API key from environment variable.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    raise ValueError("No 'OPENAI_API_KEY' found in environment variables. Please set it in your .env file.")

openai.api_key = OPENAI_API_KEY

# Load ad generation configuration for character limits
CONFIG_PATH = os.getenv("ADGEN_CONFIG_PATH", "config.json")
try:
    with open(CONFIG_PATH, encoding="utf-8") as config_file:
        CONFIG = json.load(config_file)
except FileNotFoundError:
    raise FileNotFoundError(f"No config file found at {CONFIG_PATH}. Please add a config.json in the project root.")

@dataclass
class GoogleSearchAd:
    """Schema for a Google Search Ad."""
    headline_1: str = field(default="")
    headline_2: str = field(default="")
    headline_3: str = field(default="")
    description_1: str = field(default="")
    description_2: str = field(default="")
    max_headline_chars: int = field(default=30, init=False)
    max_description_chars: int = field(default=90, init=False)

@dataclass
class MetaAd:
    """Schema for a Meta (Facebook/Instagram) Ad."""
    primary_text: str = field(default="")
    headline: str = field(default="")
    link_description: str = field(default="")
    max_primary_chars: int = field(default=125, init=False)
    max_headline_chars: int = field(default=40, init=False)
    max_link_desc_chars: int = field(default=30, init=False)

@dataclass
class LinkedInAd:
    """Schema for a LinkedIn Ad."""
    intro_text: str = field(default="")
    headline: str = field(default="")
    description: str = field(default="")
    max_intro_chars: int = field(default=150, init=False)
    max_headline_chars: int = field(default=70, init=False)
    max_desc_chars: int = field(default=100, init=False)

@dataclass
class TwitterAd:
    """Schema for a Twitter Ad."""
    tweet_text: str = field(default="")
    max_tweet_chars: int = field(default=280, init=False)

def enforce_character_limit(text: str, limit: int) -> str:
    """Truncate the text if it exceeds `limit` characters."""
    text = text or ""
    return text if len(text) <= limit else text[:limit].rstrip()

def generate_llm_ad_copy(context: str, instructions: str) -> dict:
    """
    Calls the OpenAI chat completions endpoint using a model like 'gpt-3.5-turbo'
    to produce ad copy in JSON format.
    
    The prompt instructs the model to return valid JSON with keys:
    "headline", "description", "primary_text", 
    "link_description", "intro_text", "tweet_text"
    """
    # Build character limits guidance for LLM from config
    llm_limits = CONFIG.get("llm_output_limits", {})
    char_limit_section = ""
    if llm_limits:
        limit_lines = ["Character limits (chars max):"]
        for field, max_chars in llm_limits.items():
            limit_lines.append(f"- {field}: {max_chars}")
        char_limit_section = "\n".join(limit_lines) + "\n\n"
    prompt = f"""
You are a marketing copy generator.
Context: {context}
Instructions: {instructions}
{char_limit_section}
Return strictly valid JSON with these keys:
"headline", "description", "primary_text",
"link_description", "intro_text", "tweet_text"
Use short, direct language.
Example:
{{
  "headline": "Your Ad Headline",
  "description": "Your Ad Description",
  "primary_text": "Primary text for social media ads.",
  "link_description": "Link description text.",
  "intro_text": "Intro text for LinkedIn ad.",
  "tweet_text": "Tweet text for Twitter."
}}
    """.strip()

    # Use the new endpoint via openai.Chat.completions.create
    response = openai.chat.completions.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=300
    )
    
    # Access the message content using .content
    content = response.choices[0].message.content

    try:
        ad_copy = json.loads(content)
    except json.JSONDecodeError:
        ad_copy = {
            "headline": "",
            "description": "",
            "primary_text": "",
            "link_description": "",
            "intro_text": "",
            "tweet_text": ""
        }
    return ad_copy

def generate_platform_ads(context_text: str, instructions: str) -> dict:
    """
    1) Call the LLM (via OpenAI) to get ad copy in JSON form.
    2) Truncate fields to match each platform's character limits.
    3) Return dataclasses for each platform.
    """
    raw_ad_copy = generate_llm_ad_copy(context_text, instructions)

    # Apply platform-specific limits from config
    platform_cfg = CONFIG.get("platform_limits", {})

    # Google Search Ad
    google_cfg = platform_cfg.get("google_search_ad", {})
    g_h1 = google_cfg.get("headline_1", 30)
    g_h2 = google_cfg.get("headline_2", 30)
    g_h3 = google_cfg.get("headline_3", 30)
    g_d1 = google_cfg.get("description_1", 90)
    g_d2 = google_cfg.get("description_2", 90)
    google_ad = GoogleSearchAd(
        headline_1=enforce_character_limit(raw_ad_copy.get("headline", ""), g_h1),
        headline_2=enforce_character_limit("Another " + raw_ad_copy.get("headline", ""), g_h2),
        headline_3=enforce_character_limit("Buy Now", g_h3),
        description_1=enforce_character_limit(raw_ad_copy.get("description", ""), g_d1),
        description_2=enforce_character_limit("Limited time offer!", g_d2),
    )

    # Meta Ad
    meta_cfg = platform_cfg.get("meta_ad", {})
    m_pt = meta_cfg.get("primary_text", 125)
    m_h = meta_cfg.get("headline", 40)
    m_ld = meta_cfg.get("link_description", 30)
    meta_ad = MetaAd(
        primary_text=enforce_character_limit(raw_ad_copy.get("primary_text", ""), m_pt),
        headline=enforce_character_limit(raw_ad_copy.get("headline", ""), m_h),
        link_description=enforce_character_limit(raw_ad_copy.get("link_description", ""), m_ld),
    )

    # LinkedIn Ad
    linkedin_cfg = platform_cfg.get("linkedin_ad", {})
    l_it = linkedin_cfg.get("intro_text", 150)
    l_h = linkedin_cfg.get("headline", 70)
    l_d = linkedin_cfg.get("description", 100)
    linkedin_ad = LinkedInAd(
        intro_text=enforce_character_limit(raw_ad_copy.get("intro_text", ""), l_it),
        headline=enforce_character_limit(raw_ad_copy.get("headline", ""), l_h),
        description=enforce_character_limit(raw_ad_copy.get("description", ""), l_d),
    )

    # Twitter Ad
    twitter_cfg = platform_cfg.get("twitter_ad", {})
    tw_t = twitter_cfg.get("tweet_text", 280)
    twitter_ad = TwitterAd(
        tweet_text=enforce_character_limit(raw_ad_copy.get("tweet_text", ""), tw_t)
    )

    return {
        "google_search_ad": google_ad,
        "meta_ad": meta_ad,
        "linkedin_ad": linkedin_ad,
        "twitter_ad": twitter_ad,
    }

def flatten_adset(adset: dict, adset_index: int) -> List[dict]:
    """
    Flattens the adset (dict containing each platform's ad dataclass)
    into a list of dictionaries suitable for CSV export.
    """
    rows = []
    # For each platform, create a dict with common keys.
    google = adset.get("google_search_ad")
    rows.append({
        "adset": adset_index,
        "platform": "Google",
        "headline_1": google.headline_1,
        "headline_2": google.headline_2,
        "headline_3": google.headline_3,
        "description_1": google.description_1,
        "description_2": google.description_2
    })

    meta = adset.get("meta_ad")
    rows.append({
        "adset": adset_index,
        "platform": "Meta",
        "primary_text": meta.primary_text,
        "headline": meta.headline,
        "link_description": meta.link_description
    })

    linkedin = adset.get("linkedin_ad")
    rows.append({
        "adset": adset_index,
        "platform": "LinkedIn",
        "intro_text": linkedin.intro_text,
        "headline": linkedin.headline,
        "description": linkedin.description
    })

    twitter = adset.get("twitter_ad")
    rows.append({
        "adset": adset_index,
        "platform": "Twitter",
        "tweet_text": twitter.tweet_text
    })

    return rows

if __name__ == "__main__":
    # Ask the user for context and instructions.
    context = input("Enter context for the ad generation: ")
    instructions = input("Enter instructions for the ad generation: ")

    all_rows = []
    num_adsets = 5

    for i in range(1, num_adsets + 1):
        # Generate an adset.
        adset = generate_platform_ads(context, instructions)
        # Flatten the adset into CSV rows.
        rows = flatten_adset(adset, i)
        all_rows.extend(rows)

    # Define CSV columns. We include all possible columns from all platforms.
    fieldnames = [
        "adset", "platform",
        "headline_1", "headline_2", "headline_3", "description_1", "description_2",
        "primary_text", "headline", "link_description",
        "intro_text", "description",
        "tweet_text"
    ]

    # Write the rows to an Excel file.
    workbook = Workbook()
    # Remove the default sheet created by openpyxl
    default_sheet = workbook.active
    workbook.remove(default_sheet)

    platform_columns = {
        "Google": ["adset", "headline_1", "headline_2", "headline_3", "description_1", "description_2"],
        "Meta": ["adset", "primary_text", "headline", "link_description"],
        "LinkedIn": ["adset", "intro_text", "headline", "description"],
        "Twitter": ["adset", "tweet_text"]
    }

    # Create one sheet per platform with relevant columns
    for platform, columns in platform_columns.items():
        sheet = workbook.create_sheet(title=platform)
        sheet.append(columns)
        for row in all_rows:
            if row.get("platform") == platform:
                sheet.append([row.get(col, "") for col in columns])

    output_path = "adsets.xlsx"
    workbook.save(output_path)
    print(f"Ad sets have been generated and saved to {output_path}")
