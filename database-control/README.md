# Database Control

Helper files for running a multi node Cassandra cluster. The detailed configuration and Dockerfiles live under `DB[Cfg]/`.

See `DB[Cfg]/README.md` for build and deployment steps.

## Schema Helpers

Schema changes are now performed manually through `cqlsh` or automated
infrastructure scripts. Previous Python helpers for converting collection
columns and migrating data have been removed. Refer to
`shutdown-relaunch.md` for a full example of restarting nodes with updated
configuration.
