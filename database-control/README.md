# Database Control

Helper files for running a multi node Cassandra cluster. The detailed configuration and Dockerfiles live under `DB[Cfg]/`.

See `DB[Cfg]/README.md` for build and deployment steps.

## Schema Helpers

`convert_columns_to_text.py` scans the keyspace for any `list<text>`, `set<text>`
or `map<text, text>` columns and alters them to plain `TEXT`. Run it once if you
see Medusa errors about collection column types. Connection details can be
provided via environment variables:

```bash
export CASSANDRA_HOSTS=192.168.1.201,192.168.1.202,192.168.1.203
export CASSANDRA_KEYSPACE=domain_discovery
python convert_columns_to_text.py
```

If the driver fails with a `DependencyException` about the event loop when using
Python 3.12 or newer, install `gevent` and re-run the script. The script will
automatically patch gevent if available.

Newer Cassandra versions (4.0+) no longer allow altering column types or
re-adding a dropped column with a different type. If the server rejects the
alteration, the helper now renames the old column, creates a new `TEXT` column
using the original name and finally drops the renamed column. This effectively
removes any data stored in that column while keeping the original column name in
the schema.

You can also override the values using command line flags such as
`--hosts`, `--dc` and `--keyspace`.
