Hunter Bot
====================

Hunter bot is a high-performance, distributed domain enumeration and crawling tool written in Rust. It leverages asynchronous processing and a multi-worker design to efficiently harvest and validate web domains while interfacing with CassandraDB for data persistence.

Features
--------

-   **Concurrent Crawling:** Utilizes Tokio for asynchronous operations.

-   **Robust Networking:** Uses Reqwest with TLS, custom user agents, and controlled redirect handling.

-   **Domain Processing:** Extracts and normalizes domains from web pages.

-   **Database Integration:** Interfaces with Cassandra via Scylla, including support for batch inserts and status validations.

-   **Dockerized Build:** Multi-stage Docker build for a slim runtime image.

Prerequisites
-------------

-   Docker installed on your machine.

-   (Optional) Docker Compose for orchestrating multi-container setups (e.g., running Cassandra alongside the crawler).

Project Structure
-----------------

-   **Cargo.toml:** Rust project manifest.

-   **Dockerfile:** Docker build instructions.

-   **src/main.rs:** Main application source code.

-   **README.md:** Project documentation.

Docker Build and Run Instructions
---------------------------------

### Building the Docker Image

1.  Clone the repository and navigate to the project directory.

2.  Run the following command to build the Docker image:



    `docker build -t interstellar_crawler .`

### Running the Docker Container

You can run the container by configuring environment variables like `CASSANDRA_URL`.

#### Using an Environment File

1.  Create a `.env` file in the project root with your configuration, for example:

  

    `CASSANDRA_URL=127.0.0.1:9042`

2.  Run the container with:



    `docker run --env-file .env interstellar_crawler`

#### Overriding Environment Variables Directly

Alternatively, set environment variables directly in the run command:

`docker run -e CASSANDRA_URL=cassandra:9042 interstellar_crawler`

### Running with Docker Compose

To run the crawler alongside a Cassandra container, create a `docker-compose.yml` file in the project root with the following content:



`version: '3'
services:
  cassandra:
    image: cassandra:latest
    container_name: cassandra
    ports:
      - "9042:9042"
  interstellar_crawler:
    build: .
    depends_on:
      - cassandra
    environment:
      - CASSANDRA_URL=cassandra:9042`

Then, start the services using:



`docker-compose up --build`

License
-------

This project is licensed under the Apache-2.0 License.

Authors
-------

-   NASA/Cooper Station Engineeringa
## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
