#!/usr/bin/env python3
"""Migrate data from domain_discovery.domains_processed to blue_frog.domains.

This helper reads all rows from the old keyspace and converts them into the
flexible ``map<text, text>`` schema used by ``blue_frog``. It skips empty values
so the resulting map only contains fields with data. Collections and complex
objects are JSON encoded.
"""
import json
import os
from cassandra.cluster import Cluster


def to_map(row: dict) -> dict:
    """Convert a Cassandra row dictionary to a map<text, text> for insertion."""
    data = {}
    for key, value in row.items():
        if key in {"domain", "tld"}:
            continue
        if value in (None, ""):
            continue
        if isinstance(value, (dict, list, set)):
            value = json.dumps(list(value) if isinstance(value, set) else value)
        else:
            value = str(value)
        data[key] = value
    return data


def main() -> None:
    hosts = os.environ.get("CASSANDRA_HOSTS", "127.0.0.1").split(",")
    cluster = Cluster(hosts, protocol_version=4)
    session = cluster.connect()

    rows = session.execute("SELECT * FROM domain_discovery.domains_processed")
    insert_stmt = session.prepare(
        "INSERT INTO blue_frog.domains (domain, tld, data) VALUES (?, ?, ?)"
    )

    for row in rows:
        row_dict = row._asdict()
        data_map = to_map(row_dict)
        session.execute(insert_stmt, (row_dict["domain"], row_dict.get("tld", ""), data_map))

    cluster.shutdown()


if __name__ == "__main__":
    main()

