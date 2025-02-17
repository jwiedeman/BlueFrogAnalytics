import os

# Define the base directory for the docs
BASE_DIR = "src/content/docs"

# Folder and file structure
docs_structure = {
    "Introduction": [
        "Welcome.md",
        "How-ViperScan-Works.md",
        "Use-Cases.md",
        "Terminology-Glossary.md"
    ],
    "Getting-Started": [
        "Installation.md",
        "First-Scan.md",
        "Understanding-Reports.md",
        "Best-Practices.md"
    ],
    "Website-Platforms/CMS": [
        "WordPress.md", "Shopify.md", "Webflow.md", "Ghost.md",
        "Joomla.md", "Drupal.md", "Squarespace.md", "Wix.md"
    ],
    "Website-Platforms/E-Commerce": [
        "Shopify.md", "Magento.md", "WooCommerce.md", "BigCommerce.md"
    ],
    "Analytics-Platforms": [
        "Google-Analytics-4.md", "Adobe-Analytics.md",
        "Matomo.md", "Mixpanel.md", "Plausible.md"
    ],
    "Implementation-Guides/GA4": [
        "Setting-Up-GA4.md", "Tracking-Events.md", "Debugging-GA4.md",
        "GA4-on-WordPress.md", "GA4-on-Shopify.md", "GA4-on-Webflow.md",
        "GA4-on-Wix.md", "GA4-on-Drupal.md", "GA4-on-Joomla.md"
    ],
    "Implementation-Guides/Adobe-Analytics": [
        "Adobe-Implementation.md", "Data-Layer-Setup.md", "Debugging-Adobe.md",
        "Adobe-on-WordPress.md", "Adobe-on-Shopify.md", "Adobe-on-Magento.md"
    ],
    "Web-Tracking-Fundamentals": [
        "How-Tracking-Works.md", "First-Party-vs-Third-Party-Cookies.md",
        "Server-Side-Tracking.md", "Event-Tracking.md",
        "Data-Layers.md", "Cross-Domain-Tracking.md"
    ],
    "Compliance & Privacy": [
        "GDPR-Compliance.md", "CCPA-Compliance.md", "WCAG-Accessibility.md",
        "Data-Retention.md"
    ],
    "Performance & SEO": [
        "Lighthouse-Performance.md", "Core-Web-Vitals.md",
        "Structured-Data.md", "SEO-Best-Practices.md"
    ],
    "Advanced Concepts": [
        "Beacon-Calls.md", "Browser-Fingerprinting.md", "A-B-Testing-Setup.md",
        "Webhooks.md", "API-Analytics.md"
    ],
    "Debugging & Troubleshooting": [
        "Common-Issues.md", "Debugging-GA4.md",
        "Debugging-GTM.md", "Debugging-Adobe-Analytics.md"
    ],
    "Integrations": [
        "Google-Tag-Manager.md", "Facebook-Pixel.md",
        "LinkedIn-Insights-Tag.md", "TikTok-Pixel.md",
        "Server-Side-Tagging.md"
    ],
    "API Reference": [
        "ViperScan-API-Docs.md", "Authentication.md",
        "Webhooks.md", "Data-Exports.md"
    ],
    "Case Studies & Use Cases": [
        "Enterprise-Use-Case.md", "Small-Business-Use-Case.md",
        "Compliance-Success-Story.md"
    ],
    "Community & Support": [
        "FAQ.md", "Contributing.md", "Contact.md"
    ],
    "Roadmap": [
        "Upcoming-Features.md", "Feature-Requests.md"
    ]
}

# Function to create directories and files
def create_docs():
    for folder, files in docs_structure.items():
        folder_path = os.path.join(BASE_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        for file in files:
            file_path = os.path.join(folder_path, file)

            # Remove existing .mdx files if present
            mdx_path = file_path.replace(".md", ".mdx")
            if os.path.exists(mdx_path):
                os.remove(mdx_path)

            # Create new .md file if it doesn't exist
            if not os.path.exists(file_path):
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(f"---\ntitle: {file.replace('.md', '').replace('-', ' ')}\ndescription: Learn about {file.replace('.md', '').replace('-', ' ')}.\n---\n\n# {file.replace('.md', '').replace('-', ' ')}\n\nHello, world!\n")

if __name__ == "__main__":
    create_docs()
    print("✅ Documentation structure updated with `.md` files!")
