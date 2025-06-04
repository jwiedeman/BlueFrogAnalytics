import os
import csv
from pathlib import Path

import psycopg2
import sqlite3
from cassandra.cluster import Cluster

DEFAULT_DSN = "dbname=maps user=postgres host=localhost password=postgres"
DEFAULT_SQLITE = "maps.db"
DEFAULT_CSV = "businesses.csv"

def get_storage(cli_store: str | None = None) -> str:
    """Return selected storage backend."""
    return (cli_store or os.environ.get("MAPS_STORAGE", "postgres")).lower()

def get_dsn(cli_dsn: str | None = None) -> str:
    """Return the Postgres DSN from CLI or environment."""
    return cli_dsn or os.environ.get("POSTGRES_DSN", DEFAULT_DSN)


def init_db(dsn: str | None, *, storage: str | None = None):
    """Create the businesses table if needed and return a connection object or path."""
    storage = get_storage(storage)
    if storage == "cassandra":
        hosts = os.environ.get("CASSANDRA_CONTACT_POINTS", "localhost").split(",")
        keyspace = os.environ.get("CASSANDRA_KEYSPACE", "maps")
        cluster = Cluster(hosts)
        session = cluster.connect()
        session.execute(
            f"CREATE KEYSPACE IF NOT EXISTS {keyspace} WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}"
        )
        session.set_keyspace(keyspace)
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


def save_business(conn, values: tuple, *, storage: str | None = None) -> None:
    """Insert a business row using the active backend."""
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
            INSERT OR IGNORE INTO businesses (
                name, address, website, phone, reviews_average, query, latitude, longitude
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
                ON CONFLICT (name, address) DO NOTHING
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

