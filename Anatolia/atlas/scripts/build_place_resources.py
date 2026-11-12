"""Write lazy place-resource shards for the atlas panels.

Reads the local Pleiades dump and Wikidata's public SPARQL endpoint.
No browser calls. The catalogue geojson files are not rewritten.
"""

from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

from ai_archaeology.sites.pleiades import iter_places
from ai_archaeology.sites.resources import (
    commons_url,
    pleiades_record,
    resource_bucket,
    stable_record,
    strip_userinfo,
    unesco_url,
)

ROOT = Path(__file__).resolve().parents[3]
PUBLIC = ROOT / "Anatolia" / "atlas" / "public"
CURATED = PUBLIC / "sites.geojson"
WIKI = PUBLIC / "wikidata" / "sites.geojson"
SNAPSHOT = PUBLIC / "wikidata" / "snapshot.json"
OUT = PUBLIC / "resources"
DUMP = Path(os.environ.get("PLEIADES_DUMP", "/tmp/pleiades-places-latest.json.gz"))
SPARQL = "https://query.wikidata.org/sparql"
USER_AGENT = "ai-archaeology-atlas/0.1 (place resources; research)"


def main() -> None:
    curated = json.loads(CURATED.read_text())["features"]
    wiki = json.loads(WIKI.read_text())["features"]
    snapshot = json.loads(SNAPSHOT.read_text())
    before = CURATED.stat().st_size + WIKI.stat().st_size
    qid_for_curated = _curated_qids(snapshot, curated)
    pleiades_ids: set[str] = set()
    qids: set[str] = set(qid_for_curated.values())
    owners: dict[str, list[str]] = {}
    for feature in curated:
        place_id = str(feature["id"])
        pleiades_id = feature["properties"].get("pleiadesId")
        if pleiades_id:
            pleiades_ids.add(str(pleiades_id))
            owners.setdefault(str(pleiades_id), []).append(place_id)
        qid = qid_for_curated.get(place_id)
        if qid:
            owners.setdefault(qid, []).append(place_id)
    for feature in wiki:
        place_id = str(feature["id"])
        pleiades_id = feature["properties"].get("pleiadesId")
        if pleiades_id:
            pleiades_ids.add(str(pleiades_id))
            owners.setdefault(str(pleiades_id), []).append(place_id)
        if place_id.startswith("Q") and place_id[1:].isdigit():
            qids.add(place_id)
            owners.setdefault(place_id, []).append(place_id)

    pleiades: dict[str, dict] = {}
    if DUMP.is_file():
        for raw in iter_places(DUMP):
            identifier = str(raw.get("id") or "")
            if identifier not in pleiades_ids:
                continue
            pleiades[identifier] = pleiades_record(raw)
    else:
        raise SystemExit(f"Pleiades dump not found at {DUMP}")

    wikidata = _wikidata(sorted(qids))
    records: dict[str, dict] = {}
    for feature in [*curated, *wiki]:
        place_id = str(feature["id"])
        record = _record_for(feature, qid_for_curated.get(place_id), pleiades, wikidata)
        if record:
            records[place_id] = record

    if OUT.exists():
        for old in OUT.glob("*.json"):
            old.unlink()
    OUT.mkdir(parents=True, exist_ok=True)
    shards: dict[str, dict] = {}
    for place_id, record in records.items():
        shards.setdefault(resource_bucket(place_id), {})[place_id] = record
    written = 0
    for bucket in sorted(shards):
        payload = {place_id: stable_record(shards[bucket][place_id]) for place_id in sorted(shards[bucket])}
        path = OUT / f"{bucket}.json"
        encoded = (json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()
        path.write_bytes(encoded)
        written += len(encoded)
    after_catalogue = CURATED.stat().st_size + WIKI.stat().st_size
    print(json.dumps({
        "places": len(records),
        "shards": len(shards),
        "catalogueBytesBefore": before,
        "catalogueBytesAfter": after_catalogue,
        "resourceBytes": written,
        "pleiadesMatched": len(pleiades),
        "wikidataItems": len(wikidata),
    }, indent=2))


def _curated_qids(snapshot: dict, curated: list[dict]) -> dict[str, str]:
    names = {str(feature["id"]): feature["properties"]["name"].casefold() for feature in curated}
    chosen: dict[str, str] = {}
    for item in snapshot.get("dropped") or []:
        kept = item.get("kept")
        qid = item.get("qid")
        if not kept or not qid or kept in chosen:
            continue
        if item.get("name", "").casefold() == names.get(kept):
            chosen[kept] = qid
    return chosen


def _record_for(feature: dict, qid: str | None, pleiades: dict[str, dict], wikidata: dict[str, dict]) -> dict | None:
    properties = feature["properties"]
    record: dict = {"id": str(feature["id"])}
    pleiades_id = properties.get("pleiadesId")
    if pleiades_id and str(pleiades_id) in pleiades:
        extracted = pleiades[str(pleiades_id)]
        if extracted.get("names"):
            record["names"] = extracted["names"]
        if extracted.get("references"):
            record["references"] = extracted["references"]
        pleiades_url = strip_userinfo(properties.get("pleiadesUrl") or f"https://pleiades.stoa.org/places/{pleiades_id}")
        if pleiades_url:
            record["pleiadesUrl"] = pleiades_url
    elif properties.get("pleiadesUrl"):
        pleiades_url = strip_userinfo(properties["pleiadesUrl"])
        if pleiades_url:
            record["pleiadesUrl"] = pleiades_url
    wiki = wikidata.get(qid or str(feature["id"]))
    if wiki:
        if wiki.get("wikipedia"):
            record["wikipedia"] = wiki["wikipedia"]
        if wiki.get("commons"):
            commons = strip_userinfo(commons_url(wiki["commons"]))
            if commons:
                record["commons"] = commons
        if wiki.get("heritage"):
            record["heritage"] = wiki["heritage"]
        if wiki.get("directors"):
            record["directors"] = wiki["directors"]
        if wiki.get("website"):
            website = strip_userinfo(wiki["website"])
            if website:
                record["website"] = website
    if len(record) == 1:
        return None
    return record


def _wikidata(qids: list[str]) -> dict[str, dict]:
    found: dict[str, dict] = {}
    for start in range(0, len(qids), 40):
        batch = qids[start:start + 40]
        values = " ".join(f"wd:{qid}" for qid in batch)
        query = f"""
SELECT ?item ?en ?tr ?commons ?website ?unesco ?designationLabel ?director ?directorLabel WHERE {{
  VALUES ?item {{ {values} }}
  OPTIONAL {{ ?en schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }}
  OPTIONAL {{ ?tr schema:about ?item ; schema:isPartOf <https://tr.wikipedia.org/> }}
  OPTIONAL {{ ?item wdt:P373 ?commons }}
  OPTIONAL {{ ?item wdt:P856 ?website }}
  OPTIONAL {{ ?item wdt:P757 ?unesco }}
  OPTIONAL {{
    ?item wdt:P1435 ?designation .
    ?designation rdfs:label ?designationLabel .
    FILTER(LANG(?designationLabel) = "en")
  }}
  OPTIONAL {{
    ?item wdt:P4345 ?director .
    ?director rdfs:label ?directorLabel .
    FILTER(LANG(?directorLabel) = "en")
  }}
}}
"""
        rows = _sparql(query)
        for row in rows:
            item = row.get("item", {}).get("value", "")
            qid = item.rsplit("/", 1)[-1]
            slot = found.setdefault(qid, {
                "wikipedia": [],
                "commons": None,
                "website": None,
                "heritage": [],
                "directors": [],
            })
            _add_wiki(slot, "en", row.get("en"))
            _add_wiki(slot, "tr", row.get("tr"))
            commons = _value(row.get("commons"))
            if commons:
                slot["commons"] = commons
            website = _value(row.get("website"))
            if website:
                slot["website"] = website
            unesco = _value(row.get("unesco"))
            label = _value(row.get("designationLabel"))
            if label or unesco:
                url = unesco_url(unesco) if unesco else None
                text = label or "UNESCO World Heritage"
                key = (text, url)
                if key not in {(item["label"], item.get("url")) for item in slot["heritage"]}:
                    entry = {"label": text}
                    safe = strip_userinfo(url) if url else None
                    if safe:
                        entry["url"] = safe
                    slot["heritage"].append(entry)
            director = _value(row.get("director"))
            director_label = _value(row.get("directorLabel"))
            if director and director_label:
                url = director if director.startswith("http") else None
                if url and "/entity/" in url:
                    url = "https://www.wikidata.org/wiki/" + url.rsplit("/", 1)[-1]
                if not any(item["name"] == director_label for item in slot["directors"]):
                    slot["directors"].append({"name": director_label, "url": strip_userinfo(url) if url else None})
        time.sleep(0.4)
    for slot in found.values():
        if not slot["commons"]:
            slot.pop("commons")
        if not slot["website"]:
            slot.pop("website")
        if not slot["wikipedia"]:
            slot.pop("wikipedia")
        if not slot["heritage"]:
            slot.pop("heritage")
        if not slot["directors"]:
            slot.pop("directors")
        else:
            slot["directors"] = sorted(slot["directors"], key=lambda item: item["name"].casefold())
        if slot.get("wikipedia"):
            slot["wikipedia"] = sorted(slot["wikipedia"], key=lambda item: item["lang"])
        if slot.get("heritage"):
            slot["heritage"] = sorted(slot["heritage"], key=lambda item: (item["label"], item.get("url") or ""))
    return found


def _add_wiki(slot: dict, lang: str, node: dict | None) -> None:
    url = _value(node)
    cleaned = strip_userinfo(url) if url else None
    if not cleaned or "wikipedia.org" not in cleaned:
        return
    if any(item["lang"] == lang for item in slot["wikipedia"]):
        return
    slot["wikipedia"].append({"lang": lang, "url": cleaned})


def _value(node: dict | None) -> str | None:
    if not node:
        return None
    value = node.get("value")
    return value if isinstance(value, str) and value else None


def _sparql(query: str) -> list[dict]:
    url = SPARQL + "?" + urllib.parse.urlencode({"query": query})
    request = urllib.request.Request(url, headers={
        "Accept": "application/sparql-results+json",
        "User-Agent": USER_AGENT,
    })
    last_error: Exception | None = None
    for _ in range(3):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                payload = json.load(response)
            return payload["results"]["bindings"]
        except Exception as error:  # noqa: BLE001 - retry the public endpoint
            last_error = error
            time.sleep(2)
    raise RuntimeError(f"Wikidata query failed: {last_error}")


if __name__ == "__main__":
    main()
