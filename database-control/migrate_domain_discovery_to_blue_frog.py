#!/usr/bin/env python3
"""Migrate data from all ``domain_discovery`` tables to the ``blue_frog`` keyspace.

Tables in ``blue_frog`` mirror the originals but use ``TEXT`` for any collection
columns. During migration lists, sets and maps are JSON encoded so the values
remain intact.
"""
import json
import os
from cassandra.cluster import Cluster


def to_plain(value):
    """Convert complex Cassandra values to plain types."""
    if value in (None, ""):
        return None
    if isinstance(value, set):
        return json.dumps(list(value))
    if isinstance(value, (list, dict)):
        return json.dumps(value)
    return value


def migrate_table(session, table):
    meta = session.cluster.metadata.keyspaces["domain_discovery"].tables[table]
    cols = list(meta.columns.keys())
    placeholders = ", ".join(["?"] * len(cols))
    insert = session.prepare(
        f"INSERT INTO blue_frog.{table} ({', '.join(cols)}) VALUES ({placeholders})"
    )
    for row in session.execute(f"SELECT * FROM domain_discovery.{table}"):
        rd = row._asdict()
        values = [to_plain(rd.get(c)) for c in cols]
        session.execute(insert, values)




def main() -> None:
    hosts = os.environ.get("CASSANDRA_HOSTS", "127.0.0.1").split(",")
    cluster = Cluster(hosts, protocol_version=4)
    session = cluster.connect()

    tables = [
        "certstream_domains",
        "domains_processed",
        "domain_page_metrics",
        "analytics_tag_health",
        "carbon_audits",
        "dns_records",
        "misc_tool_results",
        "businesses",
        "tracking_specs",
    ]

    for name in tables:
        if name in session.cluster.metadata.keyspaces["domain_discovery"].tables:
            migrate_table(session, name)

    cluster.shutdown()


if __name__ == "__main__":
    main()

