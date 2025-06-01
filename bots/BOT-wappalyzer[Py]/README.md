# Wappalyzer Worker (Python)

Runs the Wappalyzer library against a list of URLs and stores results in PostgreSQL.
Requires a `.env` file with `DATABASE_URL` for database connection.

## Usage
```bash
pip install -r requirements.txt
npm install   # install bundled JS dependencies
python techdetect.py
```

## Docker Swarm

This image can also run as a service in Docker Swarm after being built and pushed to your registry.

```bash
docker service create --name <service-name> --env-file .env <image>:latest
```

Alternatively include the service in a stack file and deploy with `docker stack deploy`.
