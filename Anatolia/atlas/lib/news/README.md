# Adding a news item

News is a dated report about a site the atlas already holds. It does not change that site's published record, and it is not a place for a candidate or an unpublished location.

Open `siteNews.ts` and append one object to `NEWS_ITEMS`.

| Field | What to write |
| --- | --- |
| `id` | A new slug, unique in the list. Do not reuse an id. |
| `date` | The day the source itself gives, as `YYYY-MM-DD`. |
| `siteIds` | The ids of that same place: its id in `public/sites.geojson`, and its world-catalogue id when the catalogue has one. Where `lib/reading/siteIds.ts` names the site, copy that list. Göbekli Tepe's list is the Turkish site only. Pleiades 961911 is a different place, and Q134611641 is a Sefer Tepe record plotted on Göbekli Tepe: neither belongs on the Turkish site, and Q134611641 is not Sefer Tepe's id here (`Q118133735`). An unknown id fails the check. |
| `title` | A short title. |
| `summary` | One line, no line break. Say what the source reports. Do not turn it into a finding of this atlas. |
| `sourceName` | The publication's name, as the visitor should see it. |
| `sourceUrl` | An `https` address you have opened. Its host must be in `lib/externalHref.ts`, or the panel shows the name and no link. |
| `status` | `reported` when the source is passing on a claim. `disputed` when the claim is contested. `rumour-denied` when a report of it has been denied. The panel prints that word. |

A site with no items shows no News section. Order in the file does not matter: the panel sorts newest first.

## Rings on the globe

A report dated within `NEWS_RECENCY_DAYS` (90) of the visitor's own calendar day marks each site it names, when that id is in the world catalogue. Wikidata ids (`Q…`) and Pleiades numbers qualify. A curated id such as `gobekli-tepe` is the same place's other name in this file: it is not a second pin. An OpenStreetMap id is not marked. A candidate is not in the catalogue, so it cannot be marked. The legend switch starts on, and the same switch is in the globe's settings. The ring follows the globe's filters. The list in the legend flies to each marked site and quotes the headline with the source named beside it. Write the atlas's own sentences as reports. Quote a headline only with the source named beside it.

Then, from `Anatolia/atlas`:

```bash
node --experimental-strip-types scripts/check_site_news.mts
```

If the source is a new host, add the host to `lib/externalHref.ts` and a row to `docs/data-sources.md` in the same change. Record the licence as well as you can; a news page is a link, and nothing from it is copied in except the one-line summary.
