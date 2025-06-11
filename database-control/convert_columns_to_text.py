"""Utility to convert Cassandra collection columns to plain ``TEXT``.

The script scans a keyspace for any ``list<text>``, ``set<text>`` or
``map<text, text>`` columns and alters them to simple ``TEXT`` columns. This
normalises older schemas used by the Medusa workers.

Example usage with environment variables::

    export CASSANDRA_HOSTS=192.168.1.201,192.168.1.202,192.168.1.203
    export CASSANDRA_KEYSPACE=domain_discovery
    python convert_columns_to_text.py

Command line flags are still supported for overriding these values.
"""

import argparse
import os
import re

try:
    # Cassandra's driver requires a connection class. Without the C extensions
    # (libev) it falls back to asyncore which was removed in Python 3.12.
    # Patching gevent ensures a supported event loop is available even when
    # the driver was installed without its bundled libev reactor.
    from gevent import monkey

    monkey.patch_all()  # noqa: E402
except Exception:  # pragma: no cover - gevent is optional
    pass

from cassandra.cluster import Cluster


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert collection columns to TEXT for compatibility"
    )
    hosts_env = os.environ.get("CASSANDRA_HOSTS") or os.environ.get("CASSANDRA_CONTACT_POINTS", "127.0.0.1")
    dc_env = os.environ.get("CASSANDRA_DC", os.environ.get("CASSANDRA_LOCAL_DATA_CENTER", "datacenter1"))
    keyspace_env = os.environ.get("CASSANDRA_KEYSPACE", "domain_discovery")

    parser.add_argument(
        "--hosts",
        default=hosts_env,
        help="Comma separated Cassandra contact points (env CASSANDRA_HOSTS)",
    )
    parser.add_argument(
        "--dc",
        default=dc_env,
        help="Local data center (env CASSANDRA_DC or CASSANDRA_LOCAL_DATA_CENTER)",
    )
    parser.add_argument(
        "--keyspace",
        default=keyspace_env,
        help="Target keyspace (env CASSANDRA_KEYSPACE)",
    )
    args = parser.parse_args()

    cluster = Cluster(args.hosts.split(","), protocol_version=4)
    session = cluster.connect()

    rows = session.execute(
        "SELECT table_name, column_name, type FROM system_schema.columns WHERE keyspace_name=%s",
        (args.keyspace,),
    )

    pattern = re.compile(r"^(list<text>|set<text>|map<text,\s*text>)$", re.I)
    for row in rows:
        current = row.type.strip().lower()
        if pattern.match(current):
            tbl = row.table_name
            col = row.column_name
            print(f"Altering {tbl}.{col} ({row.type}) -> text")
            session.execute(
                f"ALTER TABLE {args.keyspace}.{tbl} ALTER {col} TYPE text"
            )

    cluster.shutdown()


if __name__ == "__main__":
    main()
