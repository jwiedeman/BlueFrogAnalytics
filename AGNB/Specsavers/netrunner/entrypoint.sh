#!/usr/bin/env sh
set -e

# entrypoint.sh: wrapper to run flow-runner CLI based on environment variables

# FLOW: path to flow YAML file, absolute or relative to /app
if [ -z "$FLOW" ]; then
  echo "Error: FLOW environment variable is not set (e.g., flows/my_flow.yaml)" >&2
  exit 1
fi

# Determine actual flow file path
if [ -f "$FLOW" ]; then
  FLOW_PATH="$FLOW"
elif [ -f "/app/$FLOW" ]; then
  FLOW_PATH="/app/$FLOW"
else
  echo "Error: Flow file not found at '$FLOW' or '/app/$FLOW'" >&2
  exit 1
fi

# Set defaults
BROWSER=${BROWSER:-chromium}
OUTPUT_DIR=${OUTPUT:-/app/output}
TIMEOUT=${TIMEOUT:-120000}
LOG_LEVEL=${LOG_LEVEL:-info}

# Export log level for Pino
export LOG_LEVEL

# Execute the flow-runner CLI
exec node src/cli.js run "$FLOW_PATH" \
  --browser="$BROWSER" \
  --output="$OUTPUT_DIR" \
  --timeout="$TIMEOUT"