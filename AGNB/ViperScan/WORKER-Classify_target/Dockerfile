# Dockerfile

# 1) Build the Go binary
FROM golang:1.21-alpine AS builder
WORKDIR /app
# (optional) If you have go.mod/go.sum, copy and download dependencies:
# COPY go.mod go.sum ./
# RUN go mod download

COPY . .
RUN go build -o site-classifier

# 2) Final image
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl bash \
    && rm -rf /var/lib/apt/lists/*

# Container configuration via ENV (override at runtime as needed)
ENV CASSANDRA_HOSTS="192.168.1.201,192.168.1.202,192.168.1.203"
ENV CASSANDRA_KEYSPACE="domain_discovery"
ENV OLLAMA_MODEL="llama3:8b"

# Copy binary
# Copy the classifier binary
COPY --from=builder /app/site-classifier /usr/local/bin/site-classifier

# Install Ollama CLI for LLM access (using the official installer)
# Install Ollama CLI for LLM access (using the official installer)
RUN curl -sSf https://ollama.com/install.sh | bash
# Pre-pull the specified model to avoid runtime downloads
# Temporarily start Ollama server in build, wait for it, pull the model, then stop server
RUN ollama serve & pid=$! \
    && echo "⏳ Pre-pulling model $OLLAMA_MODEL..." \
    && until ollama list >/dev/null 2>&1; do sleep 1; done \
    && ollama pull "$OLLAMA_MODEL" \
    && kill $pid

# Add entrypoint wrapper to start Ollama server before the classifier
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Fix Windows line endings in entrypoint and make executable
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
