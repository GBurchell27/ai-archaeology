from ai_archaeology.world.radiocarbon_sites import (
    aggregate_site_dates,
    calendar_year_from_radiocarbon_age,
    p3k14c_date_rows,
    xronos_date_rows,
)


def date_row(age, site_key="a", lon=10.0, lat=50.0, period=""):
    return {"siteKey": site_key, "name": f"Site {site_key}", "lon": lon, "lat": lat, "age": age, "period": period}


def test_conversion_is_monotonic_and_lands_known_anchors():
    years = [calendar_year_from_radiocarbon_age(age) for age in range(0, 50001, 50)]
    assert all(older < younger for younger, older in zip(years, years[1:]))
    assert abs(calendar_year_from_radiocarbon_age(10000) - -9500) <= 300
    assert abs(calendar_year_from_radiocarbon_age(4500) - -3200) <= 300
    assert abs(calendar_year_from_radiocarbon_age(2000) - 0) <= 150


def test_aggregation_spans_oldest_to_youngest_and_drops_bad_rows():
    rows = [
        date_row(5000, period="Neolithic"), date_row(4000, period="Neolithic"), date_row(4500, period="Bronze"),
        date_row(3000, site_key="zero", lon=0.0, lat=0.0),
        date_row(3000, site_key="missing", lon=None),
        date_row(0, site_key="modern"),
    ]
    (record,) = aggregate_site_dates(rows, "p3k14c")
    assert record["nDates"] == 3 and record["source"] == "p3k14c"
    assert record["startYear"] == calendar_year_from_radiocarbon_age(5000)
    assert record["endYear"] == calendar_year_from_radiocarbon_age(4000)
    assert record["periods"] == ["Neolithic", "Bronze"]


def test_outliers_are_trimmed_only_for_well_dated_sites():
    rows = [date_row(4000 + step) for step in range(20)] + [date_row(40000)]
    (record,) = aggregate_site_dates(rows, "xronos")
    assert record["startYear"] > calendar_year_from_radiocarbon_age(5000)
    (sparse,) = aggregate_site_dates([date_row(4000), date_row(40000)], "xronos")
    assert sparse["startYear"] == calendar_year_from_radiocarbon_age(40000)


def test_source_tables_become_date_rows():
    p3k_row = {"Age": "5000", "Long": "10.5", "Lat": "50", "Period": "Neolithic", "SiteID": "", "SiteName": "Alpha", "Country": "X"}
    (row,) = p3k14c_date_rows([p3k_row])
    assert (row["name"], row["lon"], row["age"], row["siteKey"]) == ("Alpha", 10.5, 5000.0, ("alpha", "X"))

    joined = list(xronos_date_rows(
        sites=[{"id": "7", "name": "Beta", "lat": "40", "lng": "30"}],
        contexts=[{"id": "70", "site_id": "7"}],
        samples=[{"id": "700", "context_id": "70"}],
        c14s=[{"sample_id": "700", "c14_age": "8000"}, {"sample_id": "999", "c14_age": "1"}],
    ))
    assert [(row["name"], row["lon"], row["age"]) for row in joined] == [("Beta", 30.0, 8000.0)]
