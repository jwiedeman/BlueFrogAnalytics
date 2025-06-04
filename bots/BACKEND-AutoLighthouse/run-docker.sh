#!/usr/bin/env bash
set -euo pipefail

# run-docker.sh: Build and run the Lighthouse Site Auditor Docker container
# with automatic mounting of the output directory to the host.

# Collect all CLI arguments for the auditor command
ARGS=("$@")

# Default output directory
OUTPUT_DIR="results"

# Parse for --output-dir or -d to override default
for (( i=0; i<${#ARGS[@]}; i++ )); do
  case "${ARGS[$i]}" in
    -d|--output-dir)
      if [[ $((i+1)) -lt ${#ARGS[@]} ]]; then
        OUTPUT_DIR="${ARGS[$((i+1))]}"
      fi
      break
      ;;
  esac
done

echo "Building Docker image 'lighthouse-auditor'..."
docker build -t lighthouse-auditor .

echo "Ensuring host output directory '$OUTPUT_DIR' exists..."
mkdir -p "$OUTPUT_DIR"

echo "Running Docker container and mounting '$OUTPUT_DIR'..."
docker run --rm \
  -v "$(pwd)/$OUTPUT_DIR":/app/"$OUTPUT_DIR" \
  lighthouse-auditor "${ARGS[@]}"