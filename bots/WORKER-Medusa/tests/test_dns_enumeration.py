import dns.resolver
import logging

def run_test(target, verbose=True):
    """
    Comprehensive DNS Enumeration Test with Verbose Logging.
    
    This test retrieves DNS records for the provided target domain.
    It queries the following record types:
      - A
      - AAAA
      - MX
      - NS
      - TXT (including SPF)
      
    It also performs a DMARC lookup by querying the _dmarc subdomain.
    
    Args:
        target (str): The target domain or URL.
        verbose (bool): If True, enables detailed logging.
        
    Returns:
        str: A detailed summary of each record type retrieved.
    """
    # Configure logging based on the verbose flag.
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    
    logging.debug("Starting DNS Enumeration Test.")
    
    # Normalize domain: remove URL scheme if present.
    if target.startswith("http://"):
        logging.debug("Removing 'http://' from target.")
        target = target[len("http://"):]
    elif target.startswith("https://"):
        logging.debug("Removing 'https://' from target.")
        target = target[len("https://"):]
    
    domain = target.split("/")[0].strip()
    logging.debug("Normalized domain: %s", domain)
    
    summary_lines = [f"DNS Enumeration for {domain}:"]
    record_types = ["A", "AAAA", "MX", "NS", "TXT"]
    
    for rtype in record_types:
        logging.debug("Querying %s records for domain %s", rtype, domain)
        try:
            answers = dns.resolver.resolve(domain, rtype, lifetime=10)
            records = [rdata.to_text() for rdata in answers]
            summary_lines.append(f"\n{rtype} records ({len(records)} found):")
            for record in records:
                summary_lines.append(f" - {record}")
            logging.debug("Found %d %s records.", len(records), rtype)
        except Exception as e:
            logging.error("Error querying %s records: %s", rtype, e)
            summary_lines.append(f"\n{rtype} records: Not found or error ({e})")
    
    # DMARC lookup: Query _dmarc.<domain> for TXT records.
    dmarc_domain = f"_dmarc.{domain}"
    logging.debug("Performing DMARC lookup for %s", dmarc_domain)
    try:
        answers = dns.resolver.resolve(dmarc_domain, "TXT", lifetime=10)
        dmarc_records = [rdata.to_text() for rdata in answers]
        summary_lines.append(f"\nDMARC records for {dmarc_domain} ({len(dmarc_records)} found):")
        for record in dmarc_records:
            summary_lines.append(f" - {record}")
        logging.debug("DMARC records found: %s", dmarc_records)
    except Exception as e:
        logging.error("Error during DMARC lookup: %s", e)
        summary_lines.append(f"\nDMARC records for {dmarc_domain}: Not found or error ({e})")
    
    # Check for SPF records within TXT records.
    spf_found = False
    logging.debug("Checking for SPF records in TXT records for %s", domain)
    try:
        answers = dns.resolver.resolve(domain, "TXT", lifetime=10)
        for rdata in answers:
            txt_record = rdata.to_text().strip().strip('"')
            if "v=spf1" in txt_record.lower():
                spf_found = True
                summary_lines.append(f"\nSPF record found: {txt_record}")
                logging.debug("SPF record found: %s", txt_record)
                break
        if not spf_found:
            summary_lines.append("\nNo SPF record found in TXT records.")
            logging.debug("No SPF record found in TXT records.")
    except Exception as e:
        logging.error("Error checking SPF records: %s", e)
        summary_lines.append("\nSPF record check: Not found or error.")
    
    logging.info("DNS Enumeration Test completed.")
    return "\n".join(summary_lines)
