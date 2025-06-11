#!/usr/bin/env python3
"""Create the `blue_frog` Cassandra keyspace and base tables.

The schema uses flexible `map<text, text>` columns so workers can store
arbitrary fields without strict column definitions.
"""
import os
from cassandra.cluster import Cluster


def main() -> None:
    hosts = os.environ.get("CASSANDRA_HOSTS", "127.0.0.1").split(",")
    dc = os.environ.get(
        "CASSANDRA_DC", os.environ.get("CASSANDRA_LOCAL_DATA_CENTER", "datacenter1")
    )
    cluster = Cluster(hosts, protocol_version=4)
    session = cluster.connect()

    session.execute(
        "CREATE KEYSPACE IF NOT EXISTS blue_frog WITH replication = {'class':'SimpleStrategy','replication_factor':1}"
    )
    session.set_keyspace("blue_frog")

    session.execute(
        """CREATE TABLE IF NOT EXISTS domains (
        domain text,
        tld text,
        data map<text, text>,
        PRIMARY KEY (domain, tld)
    )"""
    )

    session.execute(
        """CREATE TABLE IF NOT EXISTS page_metrics (
        domain text,
        url text,
        scan_date timestamp,
        data map<text, text>,
        PRIMARY KEY ((domain, url), scan_date)
    )"""
    )

    session.execute(
        """CREATE TABLE IF NOT EXISTS tool_results (
        domain text,
        url text,
        tool_name text,
        scan_date timestamp,
        data map<text, text>,
        PRIMARY KEY ((domain, url, tool_name), scan_date)
    )"""
    )

    session.execute(
        """CREATE TABLE IF NOT EXISTS businesses (
        name text,
        address text,
        data map<text, text>,
        PRIMARY KEY (name, address)
    )"""
    )

    cluster.shutdown()


if __name__ == "__main__":
    main()
