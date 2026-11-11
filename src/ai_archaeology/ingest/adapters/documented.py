"""Adapters whose licence is recorded and whose download is not enabled yet."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ai_archaeology.ingest.source import SourceTerrain


class FetchNotEnabled(RuntimeError):
    """The dataset is described, and this run does not download it."""


@dataclass(frozen=True)
class DocumentedAdapter:
    adapter_id: str
    source: str
    licence: str
    licence_note: str
    attribution: str
    access_url: str
    vertical_datum: str
    bare_earth: bool
    native_resolution_m: float
    fetch_enabled: bool = False

    def describe(self) -> dict:
        return {
            "adapter": self.adapter_id,
            "source": self.source,
            "licence": self.licence,
            "licence_note": self.licence_note,
            "attribution": self.attribution,
            "access_url": self.access_url,
            "vertical_datum": self.vertical_datum,
            "bare_earth": self.bare_earth,
            "native_resolution_m": self.native_resolution_m,
            "fetch_enabled": self.fetch_enabled,
        }

    def fetch(self, destination: Path, **_ignored) -> SourceTerrain:
        raise FetchNotEnabled(self.licence_note)


DOCUMENTED_ADAPTERS = {
    adapter.adapter_id: adapter
    for adapter in (
        DocumentedAdapter(
            adapter_id="netherlands_ahn",
            source="Actueel Hoogtebestand Nederland AHN4 DTM",
            licence="CC0-1.0",
            licence_note=(
                "AHN publishes the DTM as open data under CC0. The Earth Engine "
                "AHN4 catalog page restates that licence. PDOK WCS coverage "
                "identifiers were not confirmed in this run, so fetch stays off."
            ),
            attribution="Actueel Hoogtebestand Nederland (AHN), via PDOK",
            access_url="https://service.pdok.nl/rws/ahn/wcs/v1_0",
            vertical_datum="NAP",
            bare_earth=True,
            native_resolution_m=0.5,
        ),
        DocumentedAdapter(
            adapter_id="denmark_dhm",
            source="Danmarks Højdemodel DHM/Terræn",
            licence="CC-BY-4.0",
            licence_note=(
                "Dataforsyningen states that free geographic data, including "
                "the height model, is used under CC BY 4.0. The download API "
                "needs a user token, so this adapter does not fetch."
            ),
            attribution="DHM/Terræn, Styrelsen for Dataforsyning og Infrastruktur",
            access_url="https://dataforsyningen.dk/",
            vertical_datum="DVR90",
            bare_earth=True,
            native_resolution_m=0.4,
        ),
        DocumentedAdapter(
            adapter_id="slovenia_lidar",
            source="ARSO LiDAR DTM",
            licence="unconfirmed",
            licence_note=(
                "A Slovenian LiDAR DTM exists at ARSO. Its licence text was not "
                "read from an official page in this run, so the adapter refuses "
                "to download."
            ),
            attribution="Agencija Republike Slovenije za okolje",
            access_url="https://gis.arso.gov.si/",
            vertical_datum="unconfirmed",
            bare_earth=True,
            native_resolution_m=1.0,
        ),
        DocumentedAdapter(
            adapter_id="england_ea",
            source="Environment Agency LiDAR Composite DTM",
            licence="OGL-3.0",
            licence_note=(
                "Environment Agency lidar composites are published as public "
                "sector information under the Open Government Licence v3.0. "
                "Confirm the product page before a bulk download; this run "
                "does not fetch one."
            ),
            attribution=(
                "Contains public sector information licensed under the Open "
                "Government Licence v3.0. © Environment Agency"
            ),
            access_url="https://environment.data.gov.uk/survey",
            vertical_datum="Ordnance Datum Newlyn",
            bare_earth=True,
            native_resolution_m=1.0,
        ),
        DocumentedAdapter(
            adapter_id="inegi",
            source="INEGI Continuo de Elevaciones Mexicano",
            licence="unconfirmed",
            licence_note=(
                "INEGI states terms of free use on its own site. Those terms "
                "were not read in full here, so the optional Mexico adapter "
                "refuses to download."
            ),
            attribution="INEGI, Continuo de Elevaciones Mexicano",
            access_url="https://www.inegi.org.mx/app/geo2/elevacionesmex/",
            vertical_datum="unconfirmed",
            bare_earth=False,
            native_resolution_m=15.0,
        ),
    )
}
