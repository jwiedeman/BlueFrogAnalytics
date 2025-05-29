#!/usr/bin/env bash
set -e

# Entrypoint script to start the Ollama server then run the classifier
echo "▶️ Starting Ollama server for model '$OLLAMA_MODEL'"

# Determine how to start the Ollama server
if ollama help | grep -q "serve"; then
  # Start Ollama server (no model arg)
  ollama serve &
elif ollama help | grep -q "daemon"; then
  ollama daemon &
else
  echo "❌ Ollama CLI missing 'serve' or 'daemon' command" >&2
  exit 1
fi

# Wait for the Ollama server to become available
echo "⏳ Waiting for Ollama server to accept connections..."
until ollama list >/dev/null 2>&1; do
  sleep 1
done
echo "✅ Ollama server is ready"

# Execute the site classifier
exec /usr/local/bin/site-classifier "$@"