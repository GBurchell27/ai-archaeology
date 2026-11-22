# Adding a news item

News is a dated report about a site the atlas already holds. It does not change that site's published record, and it is not a place for a candidate or an unpublished location.

Open `siteNews.ts` and append one object to `NEWS_ITEMS`.

| Field | What to write |
| --- | --- |
| `id` | A new slug, unique in the list. Do not reuse an id. |
| `date` | The day the source itself gives, as `YYYY-MM-DD`. |
| `siteIds` | Every id that site already goes by: its id in `public/sites.geojson`, and its world-catalogue id (`Q…` or a Pleiades number) when the catalogue has one. Copy an existing group such as `GOBEKLI_TEPE_IDS` rather than inventing an id. An unknown id fails the check. |
| `title` | A short title. |
| `summary` | One line, no line break. Say what the source reports. Do not turn it into a finding of this atlas. |
| `sourceName` | The publication's name, as the visitor should see it. |
| `sourceUrl` | An `https` address you have opened. Its host must be in `lib/externalHref.ts`, or the panel shows the name and no link. |
| `status` | `reported` when the source is passing on a claim. `disputed` when the claim is contested. `rumour-denied` when a report of it has been denied. The panel prints that word. |

A site with no items shows no News section. Order in the file does not matter: the panel sorts newest first.

Then, from `Anatolia/atlas`:

```bash
node --experimental-strip-types scripts/check_site_news.mts
```

If the source is a new host, add the host to `lib/externalHref.ts` and a row to `docs/data-sources.md` in the same change. Record the licence as well as you can; a news page is a link, and nothing from it is copied in except the one-line summary.
