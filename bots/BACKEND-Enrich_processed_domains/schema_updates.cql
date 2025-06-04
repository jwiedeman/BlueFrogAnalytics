-- Temporary CQL schema update file for new enrichment fields
-- Run these statements in cqlsh against the domain_discovery keyspace

-- Homepage analysis fields
ALTER TABLE domain_discovery.domains_processed ADD title text;
ALTER TABLE domain_discovery.domains_processed ADD description text;
ALTER TABLE domain_discovery.domains_processed ADD more_than_5_internal_links boolean;
ALTER TABLE domain_discovery.domains_processed ADD contains_gtm_or_ga boolean;
ALTER TABLE domain_discovery.domains_processed ADD emails list<text>;
ALTER TABLE domain_discovery.domains_processed ADD wordpress_version text;
ALTER TABLE domain_discovery.domains_processed ADD server_type text;
ALTER TABLE domain_discovery.domains_processed ADD server_version text;
ALTER TABLE domain_discovery.domains_processed ADD wpjson_size_bytes int;
ALTER TABLE domain_discovery.domains_processed ADD wpjson_contains_cart boolean;
ALTER TABLE domain_discovery.domains_processed ADD linkedin_url text;
ALTER TABLE domain_discovery.domains_processed ADD has_about_page boolean;
ALTER TABLE domain_discovery.domains_processed ADD has_services_page boolean;
ALTER TABLE domain_discovery.domains_processed ADD has_cart_or_product boolean;

-- Sitemap page count
ALTER TABLE domain_discovery.domains_processed ADD sitemap_page_count int;