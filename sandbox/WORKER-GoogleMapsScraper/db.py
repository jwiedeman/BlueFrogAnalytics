import os
import csv
from pathlib import Path

import psycopg2
import sqlite3

DEFAULT_DSN = "dbname=maps user=postgres host=localhost password=postgres"
DEFAULT_SQLITE = "maps.db"
DEFAULT_CSV = "businesses.csv"

def get_storage(cli_store: str | None = None) -> str:
    """Return selected storage backend."""
    return (cli_store or os.environ.get("MAPS_STORAGE", "cassandra")).lower()

def get_dsn(cli_dsn: str | None = None) -> str:
    """Return the Postgres DSN from CLI or environment."""
    return cli_dsn or os.environ.get("POSTGRES_DSN", DEFAULT_DSN)


def init_db(dsn: str | None, *, storage: str | None = None):
    """Create the businesses table if needed and return a connection object or path."""
    storage = get_storage(storage)
    if storage == "cassandra":
        try:
            from cassandra.cluster import Cluster
        except Exception as exc:  # ImportError or DependencyException
            raise RuntimeError(
                "Cassandra driver is required for cassandra storage"
            ) from exc

        from cassandra.policies import DCAwareRoundRobinPolicy, RetryPolicy

        hosts_str = os.environ.get(
            "CASSANDRA_CONTACT_POINTS",

            os.environ.get(
                "CASSANDRA_URL",
                "192.168.1.201,192.168.1.202,192.168.1.203,192.168.1.204",
            ),

        )
        hosts = [h.strip() for h in hosts_str.split(",") if h.strip()]
        port = int(os.environ.get("CASSANDRA_PORT", "9042"))
        keyspace = os.environ.get("CASSANDRA_KEYSPACE", "maps")
        local_dc = os.environ.get("CASSANDRA_LOCAL_DATA_CENTER", os.environ.get("CASSANDRA_DC", "datacenter1"))
        cluster = Cluster(
            contact_points=hosts,
            port=port,
            load_balancing_policy=DCAwareRoundRobinPolicy(local_dc=local_dc),
            default_retry_policy=RetryPolicy(),
            protocol_version=4,
            connect_timeout=600,
            idle_heartbeat_timeout=600,
        )
        session = cluster.connect()
        session.execute(
            f"CREATE KEYSPACE IF NOT EXISTS {keyspace} WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}"
        )
        session.set_keyspace(keyspace)
        session.default_timeout = 600
        session.execute(
            """
            CREATE TABLE IF NOT EXISTS businesses (
                name text,
                address text,
                website text,
                phone text,
                reviews_average double,
                query text,
                latitude double,
                longitude double,
                PRIMARY KEY ((name, address))
            )
            """
        )
        return session
    elif storage == "sqlite":
        path = os.environ.get("SQLITE_PATH", DEFAULT_SQLITE)
        conn = sqlite3.connect(path)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS businesses (
                name TEXT,
                address TEXT,
                website TEXT,
                phone TEXT,
                reviews_average REAL,
                query TEXT,
                latitude REAL,
                longitude REAL,
                UNIQUE(name, address)
            )
            """
        )
        conn.commit()
        return conn
    elif storage == "csv":
        path = Path(os.environ.get("CSV_PATH", DEFAULT_CSV))
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "name",
                    "address",
                    "website",
                    "phone",
                    "reviews_average",
                    "query",
                    "latitude",
                    "longitude",
                ])
        return path
    else:
        conn = psycopg2.connect(dsn or DEFAULT_DSN)
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS businesses (
                    name TEXT,
                    address TEXT,
                    website TEXT,
                    phone TEXT,
                    reviews_average REAL,
                    query TEXT,
                    latitude DOUBLE PRECISION,
                    longitude DOUBLE PRECISION,
                    UNIQUE(name, address)
                )
                """
            )
            conn.commit()
        return conn


def load_business_keys(conn, *, storage: str | None = None) -> set[tuple[str, str]]:
    """Return a set of (name, address) tuples already stored."""
    storage = get_storage(storage)
    keys: set[tuple[str, str]] = set()
    if storage == "cassandra":
        rows = conn.execute("SELECT name, address FROM businesses")
        for row in rows:
            keys.add((row.name.strip().lower(), row.address.strip().lower()))
    elif storage == "sqlite":
        cur = conn.cursor()
        cur.execute("SELECT name, address FROM businesses")
        keys.update((n.strip().lower(), a.strip().lower()) for n, a in cur.fetchall())
    elif storage == "csv":
        path = Path(conn)
        if path.exists():
            with path.open() as f:
                reader = csv.DictReader(f)
                for row in reader:
                    keys.add((row["name"].strip().lower(), row["address"].strip().lower()))
    else:
        with conn.cursor() as cur:
            cur.execute("SELECT name, address FROM businesses")
            keys.update((n.strip().lower(), a.strip().lower()) for n, a in cur.fetchall())
    return keys


def save_business(conn, values: tuple, *, storage: str | None = None) -> None:
    """Insert or update a business row using the active backend."""
    storage = get_storage(storage)
    if storage == "cassandra":
        conn.execute(
            """
            INSERT INTO businesses (
                name, address, website, phone, reviews_average, query, latitude, longitude
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            values,
        )
    elif storage == "sqlite":
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO businesses (
                name, address, website, phone, reviews_average, query, latitude, longitude
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(name, address) DO UPDATE SET
                website=excluded.website,
                phone=excluded.phone,
                reviews_average=excluded.reviews_average,
                query=excluded.query,
                latitude=excluded.latitude,
                longitude=excluded.longitude
            """,
            values,
        )
        conn.commit()
    elif storage == "csv":
        path = Path(conn)
        with path.open("a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(values)
    else:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO businesses (
                    name, address, website, phone, reviews_average, query, latitude, longitude
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (name, address) DO UPDATE SET
                    website=EXCLUDED.website,
                    phone=EXCLUDED.phone,
                    reviews_average=EXCLUDED.reviews_average,
                    query=EXCLUDED.query,
                    latitude=EXCLUDED.latitude,
                    longitude=EXCLUDED.longitude
                """,
                values,
            )
            conn.commit()


def close_db(conn, *, storage: str | None = None) -> None:
    """Close the connection for the selected backend."""
    storage = get_storage(storage)
    if storage == "cassandra":
        conn.cluster.shutdown()
    elif storage in {"postgres", "sqlite"}:
        conn.close()
    # csv storage uses a file path so nothing to close

