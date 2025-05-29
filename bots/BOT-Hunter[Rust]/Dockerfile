# Stage 1: Build the binary using the official Rust image
FROM rust:1.66-slim AS builder
WORKDIR /app

# Cache dependencies by copying the manifests first
COPY Cargo.toml Cargo.lock ./
# Create a dummy main.rs to fetch dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
# Remove the dummy main.rs
RUN rm -f src/main.rs

# Copy the actual source code and rebuild
COPY . .
RUN cargo build --release

# Stage 2: Create a minimal runtime image
FROM debian:buster-slim
RUN apt-get update \
 && apt-get install -y libssl1.1 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/interstellar_crawler /usr/local/bin/interstellar_crawler

# Expose any required ports here, if applicable
# EXPOSE 8080

# Set environment variables if needed; for example, CASSANDRA_URL
# ENV CASSANDRA_URL=127.0.0.1:9042

# Run the binary
CMD ["interstellar_crawler"]
