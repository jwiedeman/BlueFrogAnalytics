#!/usr/bin/env bash
set -e

# Build all Docker images for workers and bots
BOTS_DIR="$(dirname "$0")/bots"

find "$BOTS_DIR" -name 'Dockerfile*' | while read -r dockerfile; do
  dir=$(dirname "$dockerfile")
  # Generate tag name from directory path and normalize
  tag=$(echo "${dir#${BOTS_DIR}/}" \
    | tr '[:upper:]' '[:lower:]' \
    | tr '/[] _' '--' \
    | sed -e 's/--*/-/g' -e 's/^-//' -e 's/-$//')
  echo "\nBuilding $tag from $dockerfile"
  if docker build -f "$dockerfile" -t "$tag" "$dir"; then
    echo "Built $tag"
  else
    echo "Failed to build $tag; continuing..."
  fi
done


