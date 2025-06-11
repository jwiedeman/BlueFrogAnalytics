"""Utility to convert Cassandra collection columns to TEXT.

This script scans a keyspace for columns typed as list<text>, set<text>
or map<text, text> and alters them to simple TEXT columns. Use it once to
normalize older schemas used by the Medusa workers.

Example:
  python convert_columns_to_text.py --host 127.0.0.1 --dc datacenter1 \
      --keyspace domain_discovery
"""

import argparse
import re
from cassandra.cluster import Cluster


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert collection columns to TEXT for compatibility"
    )
    parser.add_argument("--host", default="127.0.0.1", help="Cassandra contact point")
    parser.add_argument("--dc", default="datacenter1", help="Local data center")
    parser.add_argument("--keyspace", default="domain_discovery", help="Target keyspace")
    args = parser.parse_args()

    cluster = Cluster([args.host], protocol_version=4)
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
