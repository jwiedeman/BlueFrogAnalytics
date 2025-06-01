Automated Recon Test Runner
===========================

This project is a modular, minimal, and adaptable automated recon system. The core functionality is provided by a central **main.py** file that dynamically discovers and runs individual test modules located in the **tests/** folder. Each test module is a standalone Python script that exposes a `run_test()` function, which performs a specific reconnaissance task and returns a summary of its findings.

> **Note:** This tool is designed for legal, passive recon. Always ensure you have proper authorization before scanning any domain.

Internal Tests Overview
-----------------------

Below is a summary of the internal tests available in the **tests/** folder:

-   **test_certificate_details.py**\
    Retrieves detailed TLS/SSL certificate information from the target, including handshake time, TLS version, cipher suite, ALPN/NPN protocols, session reuse, compression, forward secrecy status, issuer/subject, validity period, serial number, signature algorithm, public key details, SHA256 fingerprint, and Subject Alternative Names (SANs).

-   **test_basic_response.py**\
    Checks multiple variations of the target domain (HTTP/HTTPS and www/non-www) to display redirect chains, final URLs, and HTTP status codes.

-   **test_compare_sitemaps_robots.py**\
    Retrieves and parses the robots.txt file and a sitemap (from a directive in robots.txt or the default `/sitemap.xml`) to cross-reference sitemap URL entries against Disallow directives.

-   **test_cookie_settings.py**\
    Fetches the target page and analyzes any Set-Cookie headers for security attributes like Secure, HttpOnly, and SameSite.

-   **test_directory_enumeration.py**\
    Attempts to enumerate common directories (e.g., `/admin`, `/login`, `/backup`, etc.) and reports the HTTP status codes and snippets of the response.

-   **test_dns_enumeration.py**\
    Uses DNS queries (via dnspython) to retrieve various records (A, AAAA, MX, NS, TXT, DMARC, SPF) for the target domain.

-   **test_external_resources.py**\
    Fetches the target webpage and extracts external resources (scripts, stylesheets, images, iframes, etc.) referenced on the page.

-   **test_http_methods.py**\
    Sends an OPTIONS request to the target to determine which HTTP methods are allowed, based on the `Allow` header in the response.

-   **test_http_security_headers.py**\
    Checks for the presence and values of common HTTP security headers such as X-Frame-Options, X-Content-Type-Options, Content-Security-Policy, Referrer-Policy, X-XSS-Protection, and Strict-Transport-Security.

-   **test_meta_tags.py**\
    Retrieves and parses meta tags (including Open Graph and Twitter tags) from the target webpage.

-   **test_open_ports.py**\
    Passively scans a set of common ports (e.g., 80, 443, 8080, 22, 21) to check connectivity and determine if the target is running a web server.

-   **test_passive_subdomains.py**\
    Uses Certificate Transparency logs (via crt.sh) to gather a list of unique subdomains for the target domain.

-   **test_robots_security.py**\
    Attempts to retrieve robots.txt and two common locations for security.txt (i.e., `/security.txt` and `/.well-known/security.txt`) to display their HTTP status and a sample of the content.

-   **test_server_fingerprinting.py**\
    Analyzes HTTP response headers to determine the underlying web server software, framework, or CMS.

-   **test_waf_detection.py**\
    Checks HTTP response headers for known WAF signatures (e.g., Cloudflare, Sucuri, Incapsula) to detect if a Web Application Firewall is present.

-   **test_whois.py**\
    Performs a WHOIS lookup for the target domain, including primary and secondary (referral) queries to gather registration and DNS information.

CLI Commands and Usage
----------------------

The test runner is executed via **main.py**. It supports running one, many, or all tests using command-line flags.

### Basic Command Structure



`python main.py --target <domain_or_URL> [--tests test1 test2 ...] [--all] [--verbose]`

-   **--target:**\
    Specifies the target domain or URL to scan (e.g., `example.com` or `https://example.com`).

-   **--tests:**\
    Specify one or more test names (without the `.py` extension) to run.\
    *Example:*



    `python main.py --target example.com --tests test_dns_enumeration test_meta_tags`

-   **--all:**\
    Runs all tests found in the **tests/** folder. This flag overrides the `--tests` flag if neither are provided.

-   **--verbose:**\
    Enables detailed logging output for debugging purposes.

### Example Commands

-   **Run All Tests:**



    `python main.py --target example.com --all --verbose`

-   **Run Specific Tests:**



    `python main.py --target example.com --tests test_certificate_details test_whois --verbose`

-   **Run Without Verbose Logging:**



    `python main.py --target example.com --all`

Adding a New Test
-----------------

To add a new test:

1.  Create a new Python file in the **tests/** folder (e.g., `test_new_feature.py`).

2.  Implement a `run_test(target)` function in the file.\
    Optionally, if you want the test to receive custom HTTP headers (such as a custom User-Agent), you can define the function as `run_test(target, headers)`.

3.  Save the file. The main runner will automatically discover it during execution.

Dependencies
------------

Make sure to install the required dependencies. You can list these in a **requirements.txt** file. For example:



`requests
beautifulsoup4
dnspython
cryptography`

Install the dependencies with:



`pip install -r requirements.txt`

Output
------

After running, the test runner will compile the results from each test and save them to a local text file named `results.txt`. The file will contain detailed summaries for each test, including redirect chains, error messages, and recon data.
## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
