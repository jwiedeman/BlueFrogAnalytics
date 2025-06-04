#!/usr/bin/env bash
set -euo pipefail

# run-whois-suite.sh: periodically run the WhoisNewestDomains and Whois workers
# Defaults to a 12 hour interval between runs. Override with INTERVAL_HOURS.

INTERVAL_HOURS=${INTERVAL_HOURS:-12}
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

while true; do
  echo "[whois-suite] Running newest domain grabber..."
  (cd "$SCRIPT_DIR/WORKER-WhoisNewestDomains" && go run .)

  echo "[whois-suite] Running WHOIS updater..."
  (cd "$SCRIPT_DIR/WORKER-Whois" && python whois_worker.py)

  echo "[whois-suite] Sleeping for ${INTERVAL_HOURS} hours..."
  sleep "${INTERVAL_HOURS}h"
done

