import os
import psycopg2

DEFAULT_DSN = "dbname=maps user=postgres host=localhost password=postgres"

def get_dsn(cli_dsn: str | None = None) -> str:
    """Return the Postgres DSN from CLI or environment."""
    return cli_dsn or os.environ.get("POSTGRES_DSN", DEFAULT_DSN)


def init_db(dsn: str) -> psycopg2.extensions.connection:
    """Create the businesses table if needed and return a connection."""
    conn = psycopg2.connect(dsn)
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
            """,
        )
        conn.commit()
    return conn


def save_business(conn: psycopg2.extensions.connection, values: tuple) -> None:
    """Insert a business row, ignoring duplicates."""
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
