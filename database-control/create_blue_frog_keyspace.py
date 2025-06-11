#!/usr/bin/env python3
"""Create the `blue_frog` Cassandra keyspace with explicit columns.

The script copies table layouts from the legacy ``domain_discovery`` keyspace
but converts any ``list``/``set``/``map`` types to plain ``TEXT``. This avoids
collection type issues while preserving all existing columns so Medusa can
continue inserting data without schema changes.
"""
import os
from cassandra.cluster import Cluster


def main() -> None:
    hosts = os.environ.get("CASSANDRA_HOSTS", "127.0.0.1").split(",")
    cluster = Cluster(hosts, protocol_version=4)
    session = cluster.connect()

    session.execute(
        "CREATE KEYSPACE IF NOT EXISTS blue_frog WITH replication = {'class':'SimpleStrategy','replication_factor':1}"
    )
    session.set_keyspace("blue_frog")

    meta = cluster.metadata

    def cql_type(col):
        ctype = col.cql_type
        if ctype.startswith("frozen<"):
            ctype = ctype[7:-1]
        if "<" in ctype:
            return "text"
        return ctype

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
        src = meta.keyspaces["domain_discovery"].tables.get(name)
        if not src:
            continue
        cols = [f"{c.name} {cql_type(c)}" for c in src.columns.values()]
        pk_parts = [c.name for c in src.partition_key]
        ck_parts = [c.name for c in src.clustering_key]
        if ck_parts:
            pk = f"({', '.join(pk_parts)}), {', '.join(ck_parts)}"
        else:
            pk = ", ".join(pk_parts)
        cql = f"CREATE TABLE IF NOT EXISTS {name} ({', '.join(cols)}, PRIMARY KEY ({pk}))"
        session.execute(cql)

    cluster.shutdown()


if __name__ == "__main__":
    main()
