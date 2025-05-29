# Cassandra Docker Setup

This repository provides custom Docker images and configuration files to run a resilient Cassandra cluster with:
- Three seed nodes (each on a distinct machine with static IPs 192.168.1.201, 192.168.1.202, 192.168.1.203).
- Any number of additional non-seed nodes (which will always connect to the seeds).

## Repository Layout

```text
Dockerfile.seed                    # Dockerfile for building seed-node images; copies cassandra-seed.yaml
cassandra-seed.yaml                # minimal seed-node config template
Dockerfile.node                    # Dockerfile for building non-seed-node images; copies cassandra-node.yaml
cassandra-node.yaml                # minimal non-seed-node config template
default.yaml                       # full Cassandra configuration reference (optional)
README.md                          # this documentation
```

## Prerequisites

- Docker Engine (20.10+ recommended) installed on each host.
- Each seed host must be assigned one of the IPs: 192.168.1.201, 192.168.1.202, or 192.168.1.203.
- A Docker registry (Docker Hub, GitHub Packages, etc.) to push/pull images.

## Build & Publish Images

1. Build and tag the seed-node image:
   ```bash
   docker build -f Dockerfile.seed -t <registry>/cassandra-seed:latest .
   ```

2. Build and tag the non-seed-node image:
   ```bash
   docker build -f Dockerfile.node -t <registry>/cassandra-node:latest .
   ```

3. Push both images:
   ```bash
   docker push <registry>/cassandra-seed:latest
   docker push <registry>/cassandra-node:latest
   ```

## Deploying Seed Nodes

On each seed machine (IP = 192.168.1.201, .202, or .203):

docker run -d \
```bash
docker pull <registry>/cassandra-seed:latest

# Option A: Host networking (container uses the host’s network stack)
docker run -d \
  --name cassandra-seed \
  --network host \
  -e CASSANDRA_CLUSTER_NAME="ViperScan Cluster 1" \
  -e CASSANDRA_SEEDS="192.168.1.201,192.168.1.202,192.168.1.203" \
  -e CASSANDRA_LISTEN_ADDRESS=<seed-IP> \
  -e CASSANDRA_BROADCAST_ADDRESS=<seed-IP> \
  -e CASSANDRA_BROADCAST_RPC_ADDRESS=<seed-IP> \
  <registry>/cassandra-seed:latest

# Option B: Bridge network with static IP
docker network create --driver bridge --subnet 192.168.1.0/24 cassandra-seed-net
docker run -d \
  --name cassandra-seed \
  --network cassandra-seed-net --ip <seed-IP> \
  -e CASSANDRA_CLUSTER_NAME="ViperScan Cluster 1" \
  -e CASSANDRA_SEEDS="192.168.1.201,192.168.1.202,192.168.1.203" \
  -e CASSANDRA_LISTEN_ADDRESS=<seed-IP> \
  -e CASSANDRA_BROADCAST_ADDRESS=<seed-IP> \
  -e CASSANDRA_BROADCAST_RPC_ADDRESS=<seed-IP> \
  <registry>/cassandra-seed:latest
```  

## Deploying Non-Seed Nodes

On any host that can reach the seeds:

docker run -d \
```bash
docker pull <registry>/cassandra-node:latest

# Option A: Default bridge network (outgoing connections via NAT)
docker run -d \
  --name cassandra-node1 \
  -e CASSANDRA_CLUSTER_NAME="ViperScan Cluster 1" \
  -e CASSANDRA_SEEDS="192.168.1.201,192.168.1.202,192.168.1.203" \
  -e CASSANDRA_LISTEN_ADDRESS=<node-IP> \
  -e CASSANDRA_BROADCAST_ADDRESS=<node-IP> \
  -e CASSANDRA_BROADCAST_RPC_ADDRESS=<node-IP> \
  <registry>/cassandra-node:latest

# Option B: Custom bridge network with static IP
docker network create --driver bridge --subnet 172.18.0.0/24 cassandra-net
docker run -d \
  --name cassandra-node1 \
  --network cassandra-net --ip <node-IP> \
  -e CASSANDRA_CLUSTER_NAME="ViperScan Cluster 1" \
  -e CASSANDRA_SEEDS="192.168.1.201,192.168.1.202,192.168.1.203" \
  -e CASSANDRA_LISTEN_ADDRESS=<node-IP> \
  -e CASSANDRA_BROADCAST_ADDRESS=<node-IP> \
  -e CASSANDRA_BROADCAST_RPC_ADDRESS=<node-IP> \
  <registry>/cassandra-node:latest
```  

## Stop & Start Without Re-Gossip

```bash
docker stop cassandra-node1
docker start cassandra-node1
```

## Upgrade Node Image

docker stop cassandra-node1
docker rm cassandra-node1
docker pull <registry>/cassandra-node:<node-IP>
docker run ... <registry>/cassandra-node:<node-IP>
```bash
docker stop cassandra-node1
docker rm cassandra-node1
docker pull <registry>/cassandra-node:latest
docker run ... <registry>/cassandra-node:latest
```  