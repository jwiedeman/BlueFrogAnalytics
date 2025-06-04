#!/bin/sh
# Launch the seed server and listener so they share the same container network
set -e

# Ensure a port is set for the seed server
PORT=${PORT:-4000}

echo "Starting seed server on port $PORT..."
./bin/certstream start &

echo "Starting certstream-etl listener..."
exec /usr/local/bin/certstream-etl
