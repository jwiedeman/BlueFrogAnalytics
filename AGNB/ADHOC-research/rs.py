
import openai
import requests
import time
import json
from googlesearch import search  # Install with `pip install google`
from bs4 import BeautifulSoup
import wikipediaapi
import os

# OpenAI API Key (set as env variable or replace directly)
OPENAI_API_KEY = os.getenv("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") or "sk-..."  # Replace if needed

# Wikipedia API Setup
wiki_wiki = wikipediaapi.Wikipedia('en')

# OpenAI API Wrapper (cheap version)
def chat_with_gpt(prompt, model="gpt-3.5-turbo-16k", temperature=0.2):
    """Query GPT to generate structured research results."""
    response = openai.ChatCompletion.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=4000
    )
    return response["choices"][0]["message"]["content"]

# 1️⃣ **Break Down the Topic into Sub-Topics**
def break_into_subtopics(topic):
    """Use GPT to generate subtopics recursively."""
    prompt = f"""Break down the topic "{topic}" into 4-6 highly relevant subtopics.
    The subtopics should comprehensively cover different angles and be research-worthy.
    Format as a Python list."""
    
    result = chat_with_gpt(prompt)
    try:
        return json.loads(result)  # Ensure it returns a list
    except:
        return ["General Overview", "Recent Developments", "Challenges", "Future Trends"]

# 2️⃣ **Gather External Data**
def google_search(query, num_results=3):
    """Use Google Search to find research sources."""
    results = []
    try:
        for url in search(query, num_results=num_results):
            results.append(url)
    except Exception as e:
        print(f"Google search failed: {e}")
    return results

def scrape_page(url):
    """Basic web scraping to extract meaningful text from a URL."""
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")
        paragraphs = soup.find_all("p")
        text = " ".join([p.text for p in paragraphs])
        return text[:2000]  # Limit to avoid excessive data
    except:
        return ""

def fetch_wikipedia(topic):
    """Fetch summary from Wikipedia."""
    page = wiki_wiki.page(topic)
    return page.summary if page.exists() else ""

# 3️⃣ **Validate & Cross-Check Information**
def validate_information(topic, gathered_data):
    """Use GPT to summarize, validate, and cross-check conflicting data."""
    combined_text = "\n\n".join(gathered_data)
    prompt = f"""
    Review and cross-check the following research data on "{topic}".
    Identify contradictions, and resolve conflicting information.
    Summarize the key takeaways in bullet points.

    Data:
    {combined_text}
    """
    return chat_with_gpt(prompt)

# 4️⃣ **Recursive Research Function**
def research_topic(topic, depth=2):
    """Recursive function to research a topic to a given depth."""
    print(f"🔍 Researching: {topic}")

    subtopics = break_into_subtopics(topic)
    gathered_data = []

    for sub in subtopics:
        print(f"   ↳ Expanding on: {sub}")
        google_results = google_search(sub)
        wikipedia_summary = fetch_wikipedia(sub)

        combined_data = [wikipedia_summary] + [scrape_page(url) for url in google_results]
        filtered_data = [d for d in combined_data if d]  # Remove empty results

        validated_info = validate_information(sub, filtered_data)
        gathered_data.append(f"### {sub} ###\n{validated_info}\n")

        # Recursion for deeper levels
        if depth > 1:
            gathered_data.append(research_topic(sub, depth - 1))

    return "\n".join(gathered_data)

# 5️⃣ **Final Report Compilation**
def generate_final_report(topic):
    """Compiles a final structured research report on the topic."""
    research_data = research_topic(topic, depth=2)
    
    prompt = f"""
    Using the following research findings, generate a structured, in-depth research report on "{topic}".
    Include a clear introduction, subtopic sections, validated insights, and a conclusion.

    Research Data:
    {research_data}
    """
    
    final_report = chat_with_gpt(prompt, model="gpt-4-turbo")  # Higher-quality model for final output
    return final_report

# 🔥 **Run the Agent**
if __name__ == "__main__":
    TOPIC = input("Enter a research topic: ")
    print("\n⏳ Researching... This may take a few minutes.")
    
    report = generate_final_report(TOPIC)
    
    # Save to a file
    with open(f"{TOPIC.replace(' ', '_')}_report.txt", "w", encoding="utf-8") as f:
        f.write(report)
    
    print("\n✅ Research Complete! Report saved.")
    print(report[:1000])  # Print first 1000 chars as preview
