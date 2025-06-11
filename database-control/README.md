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

Newer Cassandra versions (4.0+) no longer allow altering existing column types.
If you see a message about the server disallowing the change, you'll need to
recreate the affected table or keyspace with the updated schema instead of
running this conversion.

You can also override the values using command line flags such as
`--hosts`, `--dc` and `--keyspace`.
