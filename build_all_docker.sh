#!/usr/bin/env bash
set -e

# Build all Docker images for workers and bots
BOTS_DIR="$(dirname "$0")/bots"

find "$BOTS_DIR" -name 'Dockerfile*' | while read -r dockerfile; do
  dir=$(dirname "$dockerfile")
  # Generate tag name from directory path
  tag=$(echo "${dir#${BOTS_DIR}/}" | tr '[:upper:]' '[:lower:]' | tr '/[] _' '--')
  echo "\nBuilding $tag from $dockerfile"
  docker build -f "$dockerfile" -t "$tag" "$dir"
  echo "Built $tag"
done


