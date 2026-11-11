"""Read human review decisions from a private sqlite file outside git.

Rejected rows become hard-negative hooks. Missing files yield an empty list.
"""

from __future__ import annotations

import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path

_SCHEMA = Path(__file__).with_name("review_schema.sql").read_text(encoding="utf-8")


@dataclass(frozen=True)
class HardNegative:
    region_id: str
    candidate_key: str
    reason_code: str
    easting_m: float
    northing_m: float


def default_review_db() -> Path:
    override = os.environ.get("AI_ARCHAEOLOGY_REVIEW_DB")
    if override:
        return Path(override)
    return Path.home() / ".ai-archaeology" / "reviews.sqlite"


def ensure_schema(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as connection:
        connection.executescript(_SCHEMA)


def load_hard_negatives(path: Path, region_id: str | None = None) -> list[HardNegative]:
    if not path.exists():
        return []
    query = (
        "SELECT region_id, candidate_key, reason_code, easting_m, northing_m "
        "FROM review_decisions WHERE decision = 'reject' "
        "AND easting_m IS NOT NULL AND northing_m IS NOT NULL"
    )
    parameters: tuple = ()
    if region_id is not None:
        query += " AND region_id = ?"
        parameters = (region_id,)
    with sqlite3.connect(path) as connection:
        rows = connection.execute(query, parameters).fetchall()
    return [
        HardNegative(
            region_id=str(row[0]),
            candidate_key=str(row[1]),
            reason_code=str(row[2] or ""),
            easting_m=float(row[3]),
            northing_m=float(row[4]),
        )
        for row in rows
    ]


def record_model_version(path: Path, model_id: str, kind: str, regions: str, resolution_m: float, metrics_json: str, created_at: str) -> None:
    ensure_schema(path)
    with sqlite3.connect(path) as connection:
        connection.execute(
            "INSERT OR REPLACE INTO model_versions VALUES (?, ?, ?, ?, ?, ?)",
            (model_id, kind, regions, resolution_m, created_at, metrics_json),
        )


def record_eval_run(path: Path, eval_id: str, model_id: str, region_id: str, protocol: str, metrics_json: str, created_at: str) -> None:
    ensure_schema(path)
    with sqlite3.connect(path) as connection:
        connection.execute(
            "INSERT OR REPLACE INTO eval_runs VALUES (?, ?, ?, ?, ?, ?)",
            (eval_id, model_id, region_id, protocol, metrics_json, created_at),
        )
