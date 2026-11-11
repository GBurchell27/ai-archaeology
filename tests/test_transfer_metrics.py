"""Recall, feature-class scale, and adapters that must not download."""

from pathlib import Path

import numpy as np
import pytest

from ai_archaeology.ingest.adapters import get_adapter
from ai_archaeology.ingest.adapters.documented import FetchNotEnabled
from ai_archaeology.regions.load import load_registry
from ai_archaeology.transfer.recall import candidate_count, recall_at_radii
from ai_archaeology.transfer.scales import visibility

ROOT = Path(__file__).resolve().parents[1]


def test_feature_classes_at_thirty_metres():
    assert visibility(25, 60, 30) == "unresolved"
    assert visibility(8, 30, 30) == "unresolved"
    assert visibility(10, 30, 30) == "unresolved"
    assert visibility(30, 80, 30) == "marginal"
    assert visibility(80, 200, 30) == "present"
    assert visibility(200, 1000, 30) == "present"


def test_recall_at_fixed_radii():
    sites = np.asarray([[0.0, 0.0], [1000.0, 0.0]])
    candidates = np.asarray([[100.0, 0.0], [900.0, 0.0]])
    recalls = recall_at_radii(candidates, sites, (50.0, 250.0))
    assert recalls["50"] == 0.0
    assert recalls["250"] == 1.0


def test_candidate_count_follows_density():
    assert candidate_count(10.0, 0.5) == 5


def test_registry_keeps_turkey_as_the_transfer_target():
    regions = {region.region_id: region for region in load_registry(ROOT / "regions")}
    assert regions["turkey_tektek"].is_transfer_target
    assert regions["ireland_roscommon"].role == "source"
    assert regions["united_states_cahokia"].role == "source"
    assert regions["ireland_roscommon"].validation.frozen.method == "eastern_columns"


def test_unconfirmed_adapters_do_not_download():
    for adapter_id in ("inegi", "slovenia_lidar"):
        with pytest.raises(FetchNotEnabled):
            get_adapter(adapter_id).fetch(Path("/tmp/unused"))
