#!/usr/bin/env python3
"""Migrate data from all domain_discovery tables to the blue_frog keyspace.

This expands upon ``migrate_domains_to_blue_frog.py`` by copying the rest of
``domain_discovery`` tables into their flexible counterparts. Values are stored
in ``map<text, text>`` columns so new fields do not require schema changes.
"""
import json
import os
from cassandra.cluster import Cluster


def to_map(row: dict, skip: set) -> dict:
    """Convert a Cassandra row dictionary to a ``map<text, text>``."""
    data = {}
    for key, value in row.items():
        if key in skip:
            continue
        if value in (None, ""):
            continue
        if isinstance(value, (dict, list, set)):
            value = json.dumps(list(value) if isinstance(value, set) else value)
        else:
            value = str(value)
        data[key] = value
    return data


def migrate_domains(session):
    rows = session.execute("SELECT * FROM domain_discovery.domains_processed")
    insert_stmt = session.prepare(
        "INSERT INTO blue_frog.domains (domain, tld, data) VALUES (?, ?, ?)"
    )
    for row in rows:
        rd = row._asdict()
        session.execute(insert_stmt, (rd["domain"], rd.get("tld", ""), to_map(rd, {"domain", "tld"})))


def migrate_page_metrics(session):
    rows = session.execute("SELECT * FROM domain_discovery.domain_page_metrics")
    insert_stmt = session.prepare(
        "INSERT INTO blue_frog.page_metrics (domain, url, scan_date, data) VALUES (?, ?, ?, ?)"
    )
    for row in rows:
        rd = row._asdict()
        session.execute(
            insert_stmt,
            (rd["domain"], rd["url"], rd["scan_date"], to_map(rd, {"domain", "url", "scan_date"}))
        )


def migrate_tool_results(session):
    insert_stmt = session.prepare(
        "INSERT INTO blue_frog.tool_results (domain, url, tool_name, scan_date, data) VALUES (?, ?, ?, ?, ?)"
    )
    # analytics_tag_health has no URL column
    rows = session.execute("SELECT * FROM domain_discovery.analytics_tag_health")
    for row in rows:
        rd = row._asdict()
        session.execute(
            insert_stmt,
            (rd["domain"], "", "analytics_tag_health", rd["scan_date"], to_map(rd, {"domain", "scan_date"}))
        )
    # carbon_audits
    rows = session.execute("SELECT * FROM domain_discovery.carbon_audits")
    for row in rows:
        rd = row._asdict()
        session.execute(
            insert_stmt,
            (rd["domain"], rd["url"], "carbon_audits", rd["scan_date"], to_map(rd, {"domain", "url", "scan_date"}))
        )
    # dns_records
    rows = session.execute("SELECT * FROM domain_discovery.dns_records")
    for row in rows:
        rd = row._asdict()
        session.execute(
            insert_stmt,
            (rd["domain"], rd["record_type"], "dns_records", rd["scan_date"], to_map(rd, {"domain", "record_type", "record_value", "scan_date"}))
        )
    # misc_tool_results already has tool_name
    rows = session.execute("SELECT * FROM domain_discovery.misc_tool_results")
    for row in rows:
        rd = row._asdict()
        session.execute(
            insert_stmt,
            (rd["domain"], rd["url"], rd["tool_name"], rd["scan_date"], to_map(rd, {"domain", "url", "tool_name", "scan_date"}))
        )


def migrate_businesses(session):
    rows = session.execute("SELECT * FROM domain_discovery.businesses")
    insert_stmt = session.prepare(
        "INSERT INTO blue_frog.businesses (name, address, data) VALUES (?, ?, ?)"
    )
    for row in rows:
        rd = row._asdict()
        session.execute(insert_stmt, (rd["name"], rd["address"], to_map(rd, {"name", "address"})))


def main() -> None:
    hosts = os.environ.get("CASSANDRA_HOSTS", "127.0.0.1").split(",")
    cluster = Cluster(hosts, protocol_version=4)
    session = cluster.connect()

    migrate_domains(session)
    migrate_page_metrics(session)
    migrate_tool_results(session)
    migrate_businesses(session)

    cluster.shutdown()


if __name__ == "__main__":
    main()

