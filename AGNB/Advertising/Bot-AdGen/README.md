# AI-Powered Multi-Platform Ad Generator

This Python script generates ad copy for multiple platforms—Google Search, Meta (Facebook/Instagram), LinkedIn, and Twitter—by leveraging OpenAI's GPT models. It prompts the user for context and instructions, formats the response, enforces platform-specific character limits, and exports the results to an Excel file with separate sheets per platform.

## Features
- Generate tailored ad copy for four major ad platforms in one run.
- Automatically enforce character limits for each platform.
- Package ad copy into Python dataclasses for clear structure.
- Output a comprehensive Excel file (adsets.xlsx) with separate sheets for each platform.

## Prerequisites
- Python 3.7 or higher
- An OpenAI API key
- A `.env` file in the project root containing:

  ```bash
  OPENAI_API_KEY=your_api_key_here
  ```
- Install dependencies:

  ```bash
  pip install python-dotenv openai
  ```

## Usage
1. Clone or download the repository.
2. Create a `.env` file with your OpenAI API key (see Prerequisites).
3. (Optional) Create and activate a virtual environment:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
4. Install required packages:

   ```bash
   pip install python-dotenv openai
   ```
5. Run the generator:

   ```bash
   python adgenerator.py
   ```
6. When prompted, enter:
   - **Context**: Background or product details (e.g., "Premium hiking boots for outdoor enthusiasts").
   - **Instructions**: Tone, keywords, or special requirements (e.g., "Emphasize durability and comfort").
7. After completion, `adsets.xlsx` will be created in the project root with 5 ad sets for each platform, organized into separate sheets: Google, Meta, LinkedIn, and Twitter.

## How It Works
1. **Prompt the LLM**: `generate_llm_ad_copy` builds a user prompt combining context and instructions, requesting JSON keys: `headline`, `description`, `primary_text`, `link_description`, `intro_text`, `tweet_text`.
2. **Parse & Truncate**: Parses the JSON response and uses `enforce_character_limit` to trim text to each platform's limits.
3. **Structuring**: Wraps text into platform-specific dataclasses:
   - `GoogleSearchAd`: headlines and descriptions
   - `MetaAd`: primary text, headline, link description
   - `LinkedInAd`: intro text, headline, description
   - `TwitterAd`: tweet text
4. **Flatten for CSV**: `flatten_adset` converts dataclasses into row dictionaries, including an `adset` index and `platform` field.
5. **Export**: Writes all rows into `adsets.csv` with columns for every platform-specific field.

## Customization
- **Number of Ad Sets**: Modify `num_adsets` in the `__main__` block.
- **Static Copy**: Adjust default `headline_2`, `headline_3`, `description_2` in `generate_platform_ads`.
- **Model & Parameters**: Change `model`, `temperature`, or `max_tokens` in `generate_llm_ad_copy`.

## Output Sample
After running, `adsets.xlsx` will contain sheets named Google, Meta, LinkedIn, and Twitter. Each sheet includes columns relevant to its platform's ad fields and rows for each generated ad set.

## License
This project has no explicit license. Use and modify at your own risk.