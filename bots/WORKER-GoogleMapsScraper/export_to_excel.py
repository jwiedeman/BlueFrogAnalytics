import sqlite3
from pathlib import Path
import sys

import pandas as pd


def export_to_excel(db_path: Path, excel_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query(
        "SELECT name, address, website, phone, reviews_average, query, latitude, longitude FROM businesses",
        conn,
    )
    df.to_excel(excel_path, index=False)
    conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python export_to_excel.py <database> <output_excel>")
        sys.exit(1)
    export_to_excel(Path(sys.argv[1]), Path(sys.argv[2]))
