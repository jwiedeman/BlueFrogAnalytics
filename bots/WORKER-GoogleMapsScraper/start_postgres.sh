#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PGDATA="$DIR/pgdata"
LOGFILE="$PGDATA/postgres.log"
PGPORT=${PGPORT:-5432}
mkdir -p "$PGDATA"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Initializing database at $PGDATA"
  PWFILE="$PGDATA/pwfile"
  echo "postgres" > "$PWFILE"
  initdb -D "$PGDATA" -U postgres -A password --pwfile="$PWFILE"
  rm "$PWFILE"
fi

pg_ctl -D "$PGDATA" -o "-p $PGPORT" -l "$LOGFILE" start
createdb -h localhost -p "$PGPORT" -U postgres maps 2>/dev/null || true
echo "Postgres running on port $PGPORT with data dir $PGDATA"
