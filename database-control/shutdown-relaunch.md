# Cassandra Shutdown and Relaunch

This guide shows how to gracefully stop each Cassandra container, remove the old container, and relaunch it with CPU/RAM/heap limits. Repeat the sequence for each node.

## Steps Overview
1. **Drain** the node so it flushes memtables and stops accepting writes.
2. **Stop** the container to allow the JVM to exit cleanly.
3. (Optional) **Confirm** the container is gone.
4. **Remove** the exited container object.
5. **Run** the container again with resource limits.

The commands below are ready to paste for each node.

---

## cassandra-seed1 (192.168.1.201)

```bash
# Drain and stop
sudo docker exec cassandra-seed1 nodetool drain
sudo docker stop cassandra-seed1

# Verify and remove
sudo docker ps -a | grep cassandra-seed1
sudo docker rm cassandra-seed1

# Relaunch
sudo docker run -d \
  --name cassandra-seed1 \
  --network host \
  --cpus="6.5" \
  --memory="13.5g" \
  --memory-swap="13.5g" \
  --ulimit nofile=100000:100000 \
  -e CASSANDRA_CLUSTER_NAME="ViperScan Cluster 1" \
  -e CASSANDRA_DC="datacenter1" \
  -e CASSANDRA_RACK="rack1" \
  -e CASSANDRA_SEEDS="192.168.1.201,192.168.1.202,192.168.1.203" \
  -e CASSANDRA_LISTEN_ADDRESS=192.168.1.201 \
  -e CASSANDRA_BROADCAST_ADDRESS=192.168.1.201 \
  -e CASSANDRA_REPLACE_ADDRESS=192.168.1.201 \
  -e MAX_HEAP_SIZE="12G" \
  -e HEAP_NEWSIZE="2G" \
  -v /mnt/cassandra/seed1/data:/var/lib/cassandra/data \
  -v /mnt/cassandra/seed1/commitlog:/var/lib/cassandra/commitlog \
  -v /mnt/cassandra/seed1/hints:/var/lib/cassandra/hints \
  -v /mnt/cassandra/seed1/saved_caches:/var/lib/cassandra/saved_caches \
  cassandra:5.0.3
```

---

## cassandra-seed2 (192.168.1.202)

```bash
# Drain and stop
sudo docker exec cassandra-seed2 nodetool drain
sudo docker stop cassandra-seed2

# Verify and remove
sudo docker ps -a | grep cassandra-seed2
sudo docker rm cassandra-seed2

# Relaunch
sudo docker run -d \
  --name cassandra-seed2 \
  --network host \
  --cpus="6.5" \
  --memory="13.5g" \
  --memory-swap="13.5g" \
  --ulimit nofile=100000:100000 \
  -e CASSANDRA_CLUSTER_NAME="ViperScan Cluster 1" \
  -e CASSANDRA_DC="datacenter1" \
  -e CASSANDRA_RACK="rack1" \
  -e CASSANDRA_SEEDS="192.168.1.201,192.168.1.202,192.168.1.203" \
  -e CASSANDRA_LISTEN_ADDRESS=192.168.1.202 \
  -e CASSANDRA_BROADCAST_ADDRESS=192.168.1.202 \
  -e CASSANDRA_REPLACE_ADDRESS=192.168.1.202 \
  -e MAX_HEAP_SIZE="12G" \
  -e HEAP_NEWSIZE="2G" \
  -v /mnt/cassandra/seed2/data:/var/lib/cassandra/data \
  -v /mnt/cassandra/seed2/commitlog:/var/lib/cassandra/commitlog \
  -v /mnt/cassandra/seed2/hints:/var/lib/cassandra/hints \
  -v /mnt/cassandra/seed2/saved_caches:/var/lib/cassandra/saved_caches \
  cassandra:5.0.3
```

---

## cassandra-seed3 (192.168.1.203)

```bash
# Drain and stop
sudo docker exec cassandra-seed3 nodetool drain
sudo docker stop cassandra-seed3

# Verify and remove
sudo docker ps -a | grep cassandra-seed3
sudo docker rm cassandra-seed3

# Relaunch
sudo docker run -d \
  --name cassandra-seed3 \
  --network host \
  --cpus="6.5" \
  --memory="13.5g" \
  --memory-swap="13.5g" \
  --ulimit nofile=100000:100000 \
  -e CASSANDRA_CLUSTER_NAME="ViperScan Cluster 1" \
  -e CASSANDRA_DC="datacenter1" \
  -e CASSANDRA_RACK="rack1" \
  -e CASSANDRA_SEEDS="192.168.1.201,192.168.1.202,192.168.1.203" \
  -e CASSANDRA_LISTEN_ADDRESS=192.168.1.203 \
  -e CASSANDRA_BROADCAST_ADDRESS=192.168.1.203 \
  -e CASSANDRA_REPLACE_ADDRESS=192.168.1.203 \
  -e MAX_HEAP_SIZE="12G" \
  -e HEAP_NEWSIZE="2G" \
  -v /mnt/cassandra/seed3/data:/var/lib/cassandra/data \
  -v /mnt/cassandra/seed3/commitlog:/var/lib/cassandra/commitlog \
  -v /mnt/cassandra/seed3/hints:/var/lib/cassandra/hints \
  -v /mnt/cassandra/seed3/saved_caches:/var/lib/cassandra/saved_caches \
  cassandra:5.0.3
```

---

## cassandra-node4 (192.168.1.204)

```bash
# Drain and stop
sudo docker exec cassandra-node4 nodetool drain
sudo docker stop cassandra-node4

# Verify and remove
sudo docker ps -a | grep cassandra-node4
sudo docker rm cassandra-node4

# Relaunch
sudo docker run -d \
  --name cassandra-node4 \
  --network host \
  --cpus="6.5" \
  --memory="13.5g" \
  --memory-swap="13.5g" \
  --ulimit nofile=100000:100000 \
  -e CASSANDRA_CLUSTER_NAME="ViperScan Cluster 1" \
  -e CASSANDRA_DC="datacenter1" \
  -e CASSANDRA_RACK="rack1" \
  -e CASSANDRA_SEEDS="192.168.1.201,192.168.1.202,192.168.1.203" \
  -e CASSANDRA_LISTEN_ADDRESS=192.168.1.204 \
  -e CASSANDRA_BROADCAST_ADDRESS=192.168.1.204 \
  -e CASSANDRA_REPLACE_ADDRESS=192.168.1.204 \
  -e MAX_HEAP_SIZE="12G" \
  -e HEAP_NEWSIZE="2G" \
  -v /mnt/cassandra/node4/data:/var/lib/cassandra/data \
  -v /mnt/cassandra/node4/commitlog:/var/lib/cassandra/commitlog \
  -v /mnt/cassandra/node4/hints:/var/lib/cassandra/hints \
  -v /mnt/cassandra/node4/saved_caches:/var/lib/cassandra/saved_caches \
  cassandra:5.0.3
```

