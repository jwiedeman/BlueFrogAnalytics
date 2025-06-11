# Database Control

Helper files for running a multi node Cassandra cluster. The detailed configuration and Dockerfiles live under `DB[Cfg]/`.

See `DB[Cfg]/README.md` for build and deployment steps.

## Schema Helpers

`convert_columns_to_text.py` scans the keyspace for any `list<text>`, `set<text>`
or `map<text, text>` columns and alters them to plain `TEXT`. Run it once if you
see Medusa errors about collection column types:

```bash
python convert_columns_to_text.py --host 127.0.0.1 --dc datacenter1 --keyspace domain_discovery
```
