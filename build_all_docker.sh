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

  build_context="$dir"
  tmp_cleanup=""

  case "$dockerfile" in
    */certstream-server/frontend/Dockerfile)
      tmpdir=$(mktemp -d)
      git clone --depth 1 https://github.com/CaliDog/certstream-server.git "$tmpdir" >/dev/null
      build_context="$tmpdir/frontend"
      tmp_cleanup="$tmpdir"
      ;;
    */certstream-server/Dockerfile)
      tmpdir=$(mktemp -d)
      git clone --depth 1 https://github.com/CaliDog/certstream-server.git "$tmpdir" >/dev/null
      build_context="$tmpdir"
      tmp_cleanup="$tmpdir"
      ;;
    */Dockerfile.combined)
      tmpdir=$(mktemp -d)
      cp -r "$dir"/* "$tmpdir"/
      rm -rf "$tmpdir/certstream-server"
      git clone --depth 1 https://github.com/CaliDog/certstream-server.git "$tmpdir/certstream-server" >/dev/null
      build_context="$tmpdir"
      tmp_cleanup="$tmpdir"
      ;;
  esac

  echo "\nBuilding $tag from $dockerfile"
  if docker build -f "$dockerfile" -t "$tag" "$build_context"; then
    echo "Built $tag"
  else
    echo "Failed to build $tag; continuing..."
  fi

  if [ -n "$tmp_cleanup" ]; then
    rm -rf "$tmp_cleanup"
  fi

done

