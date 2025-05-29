AGNB Omnirepo
=============

Welcome to the **AGNB Omnirepo**, a unified repository containing multiple projects focused on analytics, research, scraping, and automation. Each project within this repository serves a unique purpose, leveraging different technology stacks and dependencies. Below is an overview of each project, its concept, stack, and links to its respective documentation.



📜 Project Overview
-------------------

### 🟡 ADHOC Projects

#### 1️⃣ ADHOC-research

-   **Concept:** Miscellaneous scripts for exploratory analysis.
-   **Stack:** Python\
    🔗 [Project README](ADHOC-research/README.md)

### 🤖 BOT Automation Projects

#### 3️⃣ WORKER-CertStream

-   **Concept:** Monitors live SSL/TLS certificate issuance in real-time and extracts domain information for analysis.
-   **Stack:** Go (websocket, gocql)
-   **Workflow:**


```mermaid
graph TD;

  %% CertStream WebSocket Connection & Redundancy
  A[CertStream] -->|Establish WebSocket Connection| B1[Primary Attention Head];
  A -->|Establish Backup Connection| B2[Backup Attention Head];

  %% Primary Attention Head Operations
  B1 -->|Parse Incoming SSL Certificate Data| C1[Extract Domains];
  C1 -->|Send Domains to Buffer| D1[Primary Buffer];
  D1 -->|Flush Periodically to Database| E[Database Insert];

  %% Backup Attention Head Monitoring & Failover
  B2 -->|Monitor Primary for Failures| F[Heartbeat Check];
  F -->|Take Over If Primary Fails| G[Backup Promoted to Primary];
  G -->|Resume Parsing & Domain Extraction| C2[Extract Domains - Backup];
  C2 -->|Send Domains to Buffer| D2[Backup Buffer];
  D2 -->|Flush Periodically to Database| E;

  %% Auto-Recovery of Failed Primary
  B1 -->|If Primary Fails, Attempt Reconnect| H[Primary Reconnect Attempt];
  H -->|Monitor Backup for Availability| I[Check Backup Health];
  I -->|If Successful, Restore as Primary| J[Primary Restored];

  %% Logging & Monitoring
  A -->|Track Processing Statistics| K[Logging & Metrics];
  K -->|Generate Reports| L[Performance Dashboard];

  %% Final Data Flow
  E -->|Store Domains in DB| M[Domain Intelligence Database];
```

🔗 [Project README](ViperScan/WORKER-CertStream/readme.md)

#### WORKER-AutoLighthouse

- **Concept:** Runs Google Lighthouse audits across discovered sites and stores the metrics in Cassandra.
- **Stack:** Node.js, Lighthouse, Cassandra driver\
  🔗 [Project README](ViperScan/WORKER-AutoLighthouse/README.md)

#### WORKER-AutoWebPageTest

- **Concept:** Crawls a domain, generates a sitemap and executes WebPageTest on each page.
- **Stack:** Node.js, WebPageTest API\
  🔗 [Project README](ViperScan/WORKER-AutoWebPageTest/README.md)

#### WORKER-Classify_target

- **Concept:** Classifies websites using Ollama-powered LLM prompts.
- **Stack:** Go, Ollama CLI, Cassandra\
  🔗 [Project README](ViperScan/WORKER-Classify_target/README.md)

#### WORKER-Whois

- **Concept:** Updates WHOIS information for processed domains.
- **Stack:** Python, gevent, Cassandra\
  🔗 [Project README](ViperScan/WORKER-Whois/README.md)

#### WORKER-Enrich_processed_domains

- **Concept:** Adds geo, ASN, SSL and tech-stack data to domains using local MMDB files and Wappalyzer.
- **Stack:** Python, GeoIP2, Wappalyzer\
  🔗 [Project README](ViperScan/WORKER-Enrich_processed_domains/readme.md)

#### WORKER-DomainStatus

- **Concept:** Checks domain reachability via HTTP/HTTPS variations and updates status in Cassandra.
- **Stack:** Go, net/http, Cassandra\
  🔗 [Project README](ViperScan/WORKER-DomainStatus/README.md)

#### 4️⃣ BOT-Hunter

-   **Concept:** Automated hunting and reconnaissance for domain intelligence, continuously harvesting and analyzing domains from various sources.
-   **Stack:** Rust (Tokio, Reqwest, DashMap, SQLx, Scraper)
-   **Workflow:**

```mermaid
graph TD;
  
  %% Database Initialization
  A[Database] -->|Seeds Initial Domains| B[Domain Seeding];
  A -->|Validate Schema| C[Database Schema Validation];
  A -->|Recover Abandoned Domains| D[Domain Recovery];
  A -->|Validate Domain Statuses| E[Status Validation];

  %% Crawler Setup
  B -->|Fetch Batch of Unvisited Domains| F[Domain Queue];
  F -->|Distribute Workload| G[Worker Pool];
  G -->|Generate URL Variations| H[Prepare Variants];
  H -->|Send HTTP Requests| I[Check URL Responses];
  I -->|Parse HTML & Extract Links| J[HTML Parsing & Scraping];
  J -->|Normalize & Filter Domains| K[Extracted Domains];
  K -->|Insert New Domains| L[Database Insert];
  
  %% Handling Failures
  I -->|Invalid Response| M[Requeue with Exponential Backoff];
  M -->|Retry Failed Requests| G;
  K -->|Recheck Known Domains| N[Sync Visited Cache];

  %% Periodic Jobs
  A -->|Periodically Sync Cache| N;
  A -->|Recover Abandoned Domains| O[Mark Stale Domains for Reprocessing];
  A -->|Validate Statuses| P[Ensure No Stuck Processes];

  %% Worker Process
  G -->|Acquire Permit| Q[Semaphore Control];
  Q -->|Process Domain| R[Crawl & Analyze];
  R -->|Determine Variants| S[Variation Handling];
  S -->|Check If Domain Exists| T[Check in Database];
  T -->|If Exists, Skip| U[Skip Processing];
  T -->|If New, Process| V[Process New Domain];
  V -->|Attempt Variations| W[Variation Attempt];
  W -->|If Success, Extract Data| X[Extract Domains];
  X -->|Insert to Database| L;
  W -->|If Failure, Mark & Requeue| Y[Failure Handling];

  %% Logging & Monitoring
  A -->|Track Progress| Z[Log Statistics & Errors];
  Z -->|Generate Reports| AA[Performance Dashboard];
```

🔗 [Project README](ViperScan/BOT-Hunter[Rust]/readme.md)

#### 5️⃣ BOT-ripwappalyzer

-   **Concept:** Identifies and extracts technology stack data from websites.
-   **Stack:** Node.js, Puppeteer\
    🔗 [Project README](ViperScan/BOT-ripwappalyzer[Js]/README.md)

#### 6️⃣ BOT-wappalyzer

-   **Concept:** Web scraping automation for extracting technology fingerprints.
-   **Stack:** Python, Wappalyzer\
    🔗 [Project README](ViperScan/BOT-wappalyzer[Py]/README.md)

#### 7️⃣ BOT-whois-newest-domains

-   **Concept:** WHOIS lookup automation for newly registered domains.
-   **Stack:** Go\
    🔗 [Project README](ViperScan/BOT-whois-newest-domains[Go]/README.md)

### 🗂 Other Projects

- **Advertising** – ad generation tools and brand copy resources. [Readme](Advertising/README.md)
- **MockPlayer** – JavaScript mock video player for analytics demos. [Readme](MockPlayer/README.md)
- **Qax** – Electron-based Playwright test runner. [Readme](Qax/README.md)
- **Specsavers** – MITM proxy with desktop GUI. [Readme](Specsavers/README.md)
- **SpecReqs** – specification generator for analytics events. [Readme](SpecReqs/README.md)
- **ViperScan** – suite of domain intelligence workers. [Readme](ViperScan/README.md)

* * * * *

🛠️ Requirements & Setup
------------------------

Each project has its own dependencies and setup requirements. Refer to the respective project README for installation instructions.

### General Requirements

-   **Python 3.9+** (For Python-based projects)
-   **Node.js & npm** (For JavaScript-based projects)
-   **Docker** (For containerized applications)
-   **PostgreSQL/MySQL** (For database-related projects)
-   **Rust & Cargo** (If working with Rust-based components)

### Global Setup Example:



```# Clone the repository
git clone https://github.com/yourusername/AGNB.git
cd AGNB```

# Install Python dependencies (if applicable)
pip install -r requirements.txt

# Set up Docker containers (if applicable)
docker-compose up -d`

* * * * *

📌 Contribution & Documentation
-------------------------------

If you are contributing to this repository, please follow the coding standards and structure outlined in the contribution guidelines. Each project folder contains a detailed README file to help onboard developers and contributors.

For more details, check the individual project READMEs linked above.

* * * * *

© 2025 AGNB Development Team 🚀