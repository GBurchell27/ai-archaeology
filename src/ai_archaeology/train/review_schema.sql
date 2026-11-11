-- Private review store. This file is a schema stub. The database itself
-- belongs at ~/.ai-archaeology/reviews.sqlite, outside the repository.
-- easting_m and northing_m are private review coordinates. Do not export
-- them. Shareable figures move a point by at least 5 km.

CREATE TABLE IF NOT EXISTS review_decisions (
    decision_id TEXT PRIMARY KEY,
    region_id TEXT NOT NULL,
    candidate_key TEXT NOT NULL,
    decision TEXT NOT NULL,
    reason_code TEXT,
    easting_m REAL,
    northing_m REAL,
    decided_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patches (
    patch_id TEXT PRIMARY KEY,
    region_id TEXT NOT NULL,
    dataset_snapshot_id TEXT,
    label TEXT NOT NULL,
    reason_code TEXT,
    resolution_m REAL NOT NULL,
    block_id TEXT NOT NULL,
    split_role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dataset_snapshots (
    snapshot_id TEXT PRIMARY KEY,
    region_id TEXT NOT NULL,
    metadata_checksum TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_versions (
    model_id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    train_regions TEXT NOT NULL,
    resolution_m REAL NOT NULL,
    created_at TEXT NOT NULL,
    metrics_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eval_runs (
    eval_id TEXT PRIMARY KEY,
    model_id TEXT,
    region_id TEXT NOT NULL,
    protocol TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
