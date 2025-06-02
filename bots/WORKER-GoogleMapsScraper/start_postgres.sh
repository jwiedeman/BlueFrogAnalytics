#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PGDATA="$DIR/pgdata"
LOGFILE="$PGDATA/postgres.log"
mkdir -p "$PGDATA"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Initializing database at $PGDATA"
  PWFILE="$PGDATA/pwfile"
  echo "postgres" > "$PWFILE"
  initdb -D "$PGDATA" -U postgres -A password --pwfile="$PWFILE"
  rm "$PWFILE"
fi

pg_ctl -D "$PGDATA" -o "-p 5432" -l "$LOGFILE" start
createdb -U postgres maps 2>/dev/null || true
