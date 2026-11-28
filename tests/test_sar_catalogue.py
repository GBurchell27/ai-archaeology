"""Offline CLI tests using synthetic ASF GeoJSON returned by a mock transport."""

import io
import json
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit

from ai_archaeology.sar.cli import main


SEARCH = ["search", "--site", "khufu", "--start", "2024-01-01", "--end", "2024-01-31"]
TRANSPORT = "ai_archaeology.sar.acquisition.urlopen"


def feature(scene_id="synthetic-slc", **properties):
    return {
        "type": "Feature",
        "geometry": None,
        "properties": {
            "fileID": scene_id,
            "platform": "Sentinel-1A",
            "processingLevel": "SLC",
            "startTime": "2024-01-31T23:59:59.999Z",
            "beamModeType": "IW",
            "polarization": "VV+VH",
            "flightDirection": "ASCENDING",
            "pgeVersion": "synthetic-version",
            "url": "https://example.invalid/synthetic-scene.zip",
            **properties,
        },
    }


def response(*features):
    return io.BytesIO(json.dumps({"type": "FeatureCollection", "features": features}).encode())


class SarCatalogueTests(unittest.TestCase):
    def test_dry_run_builds_request_without_network(self):
        with patch(TRANSPORT) as fetch, redirect_stdout(io.StringIO()) as stdout:
            status = main([*SEARCH, "--product", "SLC", "--mode", "EW", "--incidence", "30", "42"])
        self.assertEqual(status, 0)
        fetch.assert_not_called()
        output = json.loads(stdout.getvalue())
        self.assertTrue(output["dry_run"])
        self.assertEqual(output["site_id"], "khufu")
        self.assertEqual(output["catalogue_incidence_range_deg"], [30, 42])
        self.assertEqual(output["catalogue_parameters"]["beamMode"], "EW")
        self.assertTrue(output["catalogue_parameters"]["intersectsWith"].startswith("POLYGON"))

    def test_live_query_screens_complex_metadata_and_never_fetches_assets(self):
        records = response(
            feature(incidenceAngle=30),
            feature("missing-angle", offNadirAngle=34),
            feature("outside-angle", incidenceAngle=43),
            feature("grd", processingLevel="GRD_HD", incidenceAngle=32),
            feature("incomplete", beamModeType=None, incidenceAngle=32),
            feature("outside-date", startTime="2024-02-01T00:00:00Z", incidenceAngle=32),
            feature("wrong-orbit", flightDirection="DESCENDING", incidenceAngle=32),
        )
        flags = [
            "--live", "--polarization", "VV+VH", "--orbit-direction", "ascending",
            "--incidence", "30", "42", "--limit", "7",
        ]
        with patch(TRANSPORT, return_value=records) as fetch, redirect_stdout(io.StringIO()) as stdout:
            status = main([*SEARCH, *flags])
        self.assertEqual(status, 0)
        fetch.assert_called_once()
        request = urlsplit(fetch.call_args.args[0].full_url)
        params = parse_qs(request.query)
        self.assertEqual(request.netloc, "api.daac.asf.alaska.edu")
        self.assertEqual(request.path, "/services/search/param")
        self.assertEqual(params["processingLevel"], ["SLC"])
        self.assertEqual(params["output"], ["geojson"])
        self.assertEqual(params["polarization"], ["VV+VH"])
        self.assertEqual(params["flightDirection"], ["ASCENDING"])
        self.assertEqual(params["start"], ["2024-01-01T00:00:00Z"])
        self.assertEqual(params["end"], ["2024-01-31T23:59:59.999999Z"])
        self.assertNotIn("offNadirAngle", params)

        output = json.loads(stdout.getvalue())
        self.assertFalse(output["dry_run"])
        self.assertTrue(output["catalogue_limit_reached"])
        self.assertEqual(output["records_received"], 7)
        self.assertEqual([item["scene_id"] for item in output["matches"]], ["synthetic-slc"])
        self.assertEqual(output["matches"][0]["processing_version"], "synthetic-version")
        self.assertNotIn("example.invalid", stdout.getvalue())
        reasons = {item["scene_id"]: item["reason"] for item in output["rejected"]}
        self.assertIn("unavailable", reasons["missing-angle"])
        self.assertIn("outside the requested range", reasons["outside-angle"])
        self.assertIn("Level-1 SLC", reasons["grd"])
        self.assertIn("beamModeType", reasons["incomplete"])
        self.assertIn("outside the requested UTC dates", reasons["outside-date"])
        self.assertIn("orbit_direction", reasons["wrong-orbit"])

    def test_without_angle_filter_unknown_incidence_is_retained(self):
        with patch(TRANSPORT, return_value=response(feature())), redirect_stdout(io.StringIO()) as stdout:
            status = main([*SEARCH, "--live"])
        self.assertEqual(status, 0)
        self.assertIsNone(json.loads(stdout.getvalue())["matches"][0]["catalogue_incidence_deg"])

    def test_invalid_inputs_fail_before_network(self):
        for flags in (
            ["--site", "unpublished"], ["--product", "GRD"], ["--start", "2024-02-01"],
            ["--start", "20240101"], ["--end", "2024-02-30"], ["--limit", "0"],
            ["--incidence", "nan", "42"], ["--incidence", "42", "30"],
        ):
            with self.subTest(flags=flags), patch(TRANSPORT) as fetch, redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    main([*SEARCH, "--live", *flags])
                self.assertEqual(error.exception.code, 2)
                fetch.assert_not_called()

    def test_unexpected_catalogue_payload_is_reported(self):
        payload = io.BytesIO(b'{"type":"FeatureCollection","features":null}')
        with patch(TRANSPORT, return_value=payload), redirect_stderr(io.StringIO()) as stderr:
            status = main([*SEARCH, "--live"])
        self.assertEqual(status, 1)
        self.assertIn("expected an ASF GeoJSON FeatureCollection", stderr.getvalue())

    def test_catalogue_connection_error_is_reported(self):
        with patch(TRANSPORT, side_effect=URLError("offline")), redirect_stderr(io.StringIO()) as stderr:
            status = main([*SEARCH, "--live"])
        self.assertEqual(status, 1)
        self.assertIn("ASF catalogue search failed", stderr.getvalue())
