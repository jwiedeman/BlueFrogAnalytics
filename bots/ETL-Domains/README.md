# Domain ETL

Assorted scripts for ingesting and enriching domain data. Includes CertStream listeners,
GeoIP lookups and technology detection utilities. A Dockerfile is provided for containerized runs.

## Usage
Install dependencies and run the desired script, for example:

```bash
pip install -r requirements.txt
python certstream_etl.py
```

See individual scripts for details.

## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
