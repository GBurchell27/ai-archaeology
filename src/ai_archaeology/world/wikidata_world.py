"""Published archaeological sites from Wikidata (CC0), for the world catalogue.

Pure functions only: SPARQL text, row parsing, type classification and dating.
The network lives in `sparql_client`; the harvest order in `scripts/fetch_world_wikidata.py`.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from ai_archaeology.sites.wikidata import _point, _year
from ai_archaeology.world.records import WorldSite

# Whole class trees harvested whether or not the item has a Wikipedia article.
MEGALITHIC_ROOTS = {
    "Q53336805": "megalithic site", "Q164240": "megalith", "Q101659": "dolmen",
    "Q10521078": "megalithic tomb", "Q193475": "menhir", "Q2330559": "standing stone",
    "Q1935728": "stone circle", "Q1035294": "henge", "Q1426772": "passage grave",
    "Q935773": "cromlech", "Q688292": "nuraghe", "Q1234547": "talaiot", "Q755017": "tell",
    "Q12516": "pyramid", "Q170153": "ziggurat", "Q45791": "geoglyph", "Q1193753": "stone row",
    "Q5737": "burial mound", "Q7321974": "cairn", "Q7202294": "platform mound",
    "Q1211146": "rock art",
}
# Trees kept only for items with a Wikipedia article: most of the rest are register stubs.
SITELINKED_ROOTS = {"Q839954": "archaeological site", "Q34023": "tumulus", "Q744099": "hillfort"}
# Shipwrecks sit under "archaeological site" but are mostly modern vessels.
EXCLUDED_ROOTS = {"Q852190": "shipwreck"}

LABEL_LANGUAGES = ("en", "mul", "fr", "de", "es", "it", "pt", "nl", "sv", "da", "nb", "fi", "ru", "ja", "zh", "ar", "tr")
# Mirrors ADMINISTRATIVE_YEAR in Anatolia/atlas/lib/timeline.ts: a later "inception"
# on an ancient monument is the date it was registered, not built.
ADMINISTRATIVE_YEAR = 1900
ANCIENT_TYPES = {"tell", "megalith", "tumulus", "rock-art", "cave", "enclosure", "necropolis"}
MODERN_YEAR = 1800

# First matching rule wins, so megalith beats tumulus beats settlement.
SITE_TYPE_RULES: tuple[tuple[str, str], ...] = (
    ("geoglyph", r"geoglyph|hill figure"),
    ("rock-art", r"rock art|petroglyph|rock painting|cave painting|prehistoric art|cup and ring|rock relief|rock carving|pictograph"),
    ("megalith", r"megalith|dolmen|menhir|standing stone|stone circle|cromlech|henge|passage grave|nuraghe|talaiot|taula|naveta"
                 r"|stone row|stone ship|stone setting|chambered|court cairn|wedge tomb|portal tomb|gallery grave|giants' grave"
                 r"|long barrow|\banta\b|moai|troy town|hunebed"),
    ("tell", r"\btell\b|settlement mound"),
    ("monumental", r"pyramid|ziggurat|platform mound|palace|amphitheat|\btheat|stadium|aqueduct|mausoleum|monumental"),
    ("tumulus", r"tumul|barrow|kurgan|burial mound|kofun|cairn|mamoa|\bmound"),
    ("necropolis", r"necropolis|cemetery|grave|tomb|catacomb|burial|\bcist\b"),
    ("enclosure", r"enclosure|hill ?fort|oppidum|ringfort|castro\b|castrum|castellum|earthwork|rondel|viereckschanze|\bfort\b|\bcamp\b"),
    ("cave", r"\bcave|rock shelter"),
    ("city", r"\bcity|polis\b|colony|municipium|\btown"),
    ("settlement", r"settlement|village|villa\b|vicus|domus|crannog|broch|dwelling|midden|pueblo|\bfarm"),
    ("ritual", r"temple|sanctuary|shrine|mithraeum|hieron|candi|monastery|church|sacrific|asclepeion|nymphaeum"),
)
MODERN_INTRUDER = re.compile(
    r"museum|hotel|casino|skyscraper|office|shopping|arena|memorial|sculpture|hillside letter|clearance cairn"
    r"|public art|tourist attraction|church building|greenhouse|company|artwork|land art", re.I,
)


@dataclass(frozen=True)
class ClassSets:
    megalithic: frozenset[str]
    sitelinked: frozenset[str]


@dataclass
class ItemDetails:
    labels: dict[str, str] = field(default_factory=dict)
    types: set[str] = field(default_factory=set)
    heritage: set[str] = field(default_factory=set)
    articles: set[str] = field(default_factory=set)
    images: set[str] = field(default_factory=set)
    inceptions: set[int] = field(default_factory=set)
    dissolutions: set[int] = field(default_factory=set)
    period_starts: set[int] = field(default_factory=set)
    period_ends: set[int] = field(default_factory=set)
    whs: str | None = None
    pleiades: str | None = None


def class_tree_query(roots: list[str]) -> str:
    return f"SELECT ?root ?class WHERE {{ VALUES ?root {{ {_values(roots)} }} ?class wdt:P279* ?root }}"


def items_query(classes: list[str], require_sitelink: bool, box: tuple[float, float, float, float] | None = None) -> str:
    """Items that are direct instances of the classes. Direct P31 avoids the path that times out."""
    place = "?item wdt:P625 ?coord ."
    if box is not None:
        west, south, east, north = box
        place = (
            "SERVICE wikibase:box { ?item wdt:P625 ?coord . "
            f'bd:serviceParam wikibase:cornerWest "Point({west} {south})"^^geo:wktLiteral ; '
            f'wikibase:cornerEast "Point({east} {north})"^^geo:wktLiteral . }}'
        )
    linked = "FILTER(?links > 0)" if require_sitelink else ""
    return (
        f"SELECT ?item ?coord ?links WHERE {{ VALUES ?class {{ {_values(classes)} }} "
        f"?item wdt:P31 ?class ; wikibase:sitelinks ?links . {linked} {place} }}"
    )


def items_by_id_query(qids: list[str]) -> str:
    return (
        f"SELECT ?item ?coord ?links WHERE {{ VALUES ?item {{ {_values(qids)} }} "
        "?item wdt:P625 ?coord ; wikibase:sitelinks ?links . }"
    )


def details_query(qids: list[str]) -> str:
    """One UNION branch per property, so several values never multiply rows."""
    languages = ", ".join(f'"{code}"' for code in LABEL_LANGUAGES)
    return f"""SELECT * WHERE {{
  VALUES ?item {{ {_values(qids)} }}
  {{ ?item wdt:P31 ?type }}
  UNION {{ ?item rdfs:label ?label . FILTER(LANG(?label) IN ({languages})) }}
  UNION {{ ?item wdt:P1435 ?heritage }}
  UNION {{ ?item wdt:P757 ?whs }}
  UNION {{ ?item wdt:P1584 ?pleiades }}
  UNION {{ ?item wdt:P18 ?image }}
  UNION {{ ?item wdt:P571 ?inception }}
  UNION {{ ?item wdt:P576 ?dissolved }}
  UNION {{ ?item p:P2348 ?statement . ?statement ps:P2348 ?period .
          OPTIONAL {{ ?statement pq:P580 ?statedStart }} OPTIONAL {{ ?statement pq:P582 ?statedEnd }}
          OPTIONAL {{ ?period wdt:P580 ?periodStart }} OPTIONAL {{ ?period wdt:P582 ?periodEnd }} }}
  UNION {{ ?article schema:about ?item . FILTER(CONTAINS(STR(?article), ".wikipedia.org/")) }}
}}"""


def class_labels_query(qids: list[str]) -> str:
    return (
        f"SELECT ?item ?itemLabel WHERE {{ VALUES ?item {{ {_values(qids)} }} "
        'SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". } }'
    )


def qid_of(node: dict) -> str:
    return node["value"].rsplit("/", 1)[-1]


def parse_earth_point(wkt: str) -> tuple[float, float] | None:
    """Longitude and latitude, or None when the coordinate is on the Moon, Mars or malformed."""
    if wkt.startswith("<"):  # WDQS prefixes a non-Earth globe as <entity-iri> Point(...)
        return None
    parsed = _point(wkt)
    if parsed is None or not (-180 <= parsed[0] <= 180 and -90 <= parsed[1] <= 90):
        return None
    return parsed


def first_locations(rows: list[dict]) -> dict[str, tuple[float, float, int]]:
    """qid -> (lon, lat, sitelinks). An item with several coordinates keeps the first."""
    located: dict[str, tuple[float, float, int]] = {}
    for row in rows:
        qid = qid_of(row["item"])
        point = parse_earth_point(row["coord"]["value"])
        if point is None or qid in located:
            continue
        located[qid] = (point[0], point[1], int(row["links"]["value"]))
    return located


def group_details(rows: list[dict], into: dict[str, ItemDetails] | None = None) -> dict[str, ItemDetails]:
    grouped = {} if into is None else into
    for row in rows:
        _absorb(grouped.setdefault(qid_of(row["item"]), ItemDetails()), row)
    return grouped


def _absorb(details: ItemDetails, row: dict) -> None:
    if "label" in row:
        details.labels.setdefault(row["label"].get("xml:lang", ""), row["label"]["value"])
    for key, bucket in (("type", details.types), ("heritage", details.heritage)):
        if key in row:
            bucket.add(qid_of(row[key]))
    for key, bucket in (("article", details.articles), ("image", details.images)):
        if key in row:
            bucket.add(row[key]["value"])
    for key, bucket in (("inception", details.inceptions), ("dissolved", details.dissolutions)):
        _add_year(bucket, row.get(key))
    # A date stated on the item's own period statement beats the period's general span.
    _add_year(details.period_starts, row.get("statedStart") or row.get("periodStart"))
    _add_year(details.period_ends, row.get("statedEnd") or row.get("periodEnd"))
    if "whs" in row:
        details.whs = details.whs or row["whs"]["value"]
    if "pleiades" in row:
        details.pleiades = details.pleiades or row["pleiades"]["value"]


def _add_year(bucket: set[int], node: dict | None) -> None:
    year = _year(node)
    if year is not None:
        bucket.add(year)


def classify_site_type(type_labels: list[str]) -> str:
    for site_type, pattern in SITE_TYPE_RULES:
        if any(re.search(pattern, label, re.I) for label in type_labels):
            return site_type
    return "other"


def resolve_dating(details: ItemDetails, site_type: str) -> tuple[int | None, int | None, str]:
    ancient = site_type in ANCIENT_TYPES
    inceptions = [year for year in details.inceptions if not (ancient and year > ADMINISTRATIVE_YEAR)]
    if inceptions:
        start = min(inceptions)
        ends = [year for year in details.dissolutions if year >= start] or [year for year in details.period_ends if year >= start]
        return start, (max(ends) if ends else None), "wikidata"
    if details.period_starts or details.period_ends:
        start = min(details.period_starts, default=None)
        end = max(details.period_ends, default=None)
        return start, end, "wikidata"
    return None, None, "none"


def pick_name(labels: dict[str, str]) -> str | None:
    for code in LABEL_LANGUAGES:
        if labels.get(code):
            return labels[code]
    return None


def pick_wikipedia(articles: set[str]) -> str | None:
    english = sorted(url for url in articles if url.startswith("https://en.wikipedia.org/"))
    return english[0] if english else min(articles, default=None)


def rejection_reason(details: ItemDetails, type_labels: list[str], classes: ClassSets, featured: bool) -> str | None:
    """Why an item stays out of the catalogue, or None when it belongs."""
    if featured:
        return None if pick_name(details.labels) else "unnamed"
    megalithic = bool(details.types & classes.megalithic)
    in_site_tree = bool(details.types & classes.sitelinked)
    if not megalithic and not (in_site_tree and details.articles):
        return "no-wikipedia-article"
    if not in_site_tree and _is_modern(details, type_labels):
        return "modern"
    return None if pick_name(details.labels) else "unnamed"


def _is_modern(details: ItemDetails, type_labels: list[str]) -> bool:
    if any(MODERN_INTRUDER.search(label) for label in type_labels):
        return True
    site_type = classify_site_type(type_labels)
    return site_type not in ANCIENT_TYPES and any(year >= MODERN_YEAR for year in details.inceptions)


def build_site(qid: str, location: tuple[float, float, int], details: ItemDetails, class_labels: dict[str, str]) -> WorldSite:
    type_labels = labels_for(details.types, class_labels)
    site_type = classify_site_type(type_labels)
    start, end, dating_source = resolve_dating(details, site_type)
    image = min(details.images, default=None)
    return WorldSite(
        id=qid,
        name=pick_name(details.labels) or qid,
        lon=round(location[0], 6),
        lat=round(location[1], 6),
        source="wikidata",
        licence="CC0",
        attribution="Wikidata",
        sourceUrl=f"https://www.wikidata.org/wiki/{qid}",
        siteType=site_type,
        types=type_labels,
        ids={"wikidata": qid, "pleiades": details.pleiades, "osm": None, "whs": details.whs, "xronos": None},
        startYear=start,
        endYear=end,
        datingSource=dating_source,
        importance=location[2],
        wikipedia=pick_wikipedia(details.articles),
        image=image.replace("http://", "https://", 1) if image else None,
        heritage=labels_for(details.heritage, class_labels),
    )


def labels_for(qids: set[str], class_labels: dict[str, str]) -> list[str]:
    """English labels, sorted. A class with no label would only show as a bare QID, so it is left out."""
    return sorted(class_labels[qid] for qid in qids if qid in class_labels and not re.fullmatch(r"Q\d+", class_labels[qid]))


def _values(qids: list[str]) -> str:
    return " ".join(f"wd:{qid}" for qid in qids)
