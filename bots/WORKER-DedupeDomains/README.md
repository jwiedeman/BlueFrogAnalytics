# Domain Deduplication Worker

This Go utility scans the `domains_processed` table and normalizes
TLD values. Entries where the TLD begins with a period are rewritten
without the period and duplicate rows are removed.

Run with `go run .`. Connection details are controlled through the
`CASSANDRA_HOSTS` and `CASSANDRA_KEYSPACE` environment variables.
