# Questions and theories

The record format behind the atlas's "Questions and theories" layer, and how to add to it. Read `docs/philosophy.md` first: this page is that page turned into data.

The layer holds what people have asked and proposed about a site, each idea with its owner, its sources, the evidence for and against it, and a status. It is kept apart from the site's published record and never changes it. It holds no locations.

## Where it lives

| Path | What it is |
| --- | --- |
| `Anatolia/atlas/lib/theories/theoryTypes.ts` | The record types. |
| `Anatolia/atlas/lib/theories/theoryStatus.ts` | The status ladder, its labels, and the current status of a theory. |
| `Anatolia/atlas/lib/theories/theoryRegistry.ts` | Every record, and the lookups: by id, by site, by walk landmark. |
| `Anatolia/atlas/lib/theories/gobekliTepeEvidence.ts`, `gobekliTepeTheories.ts` | Göbekli Tepe: sources, facts and evidence; then theories and questions. |
| `Anatolia/atlas/lib/theories/gizaFacts.ts`, `gizaEvidence.ts`, `gizaTheories.ts` | Giza: sources and facts; evidence; theories and questions. |
| `Anatolia/atlas/components/theories/TheoryCard.tsx`, `QuestionList.tsx`, `SiteTheories.tsx` | How a theory, a list of questions, and a site card's "Questions and theories" section are shown. |
| `Anatolia/atlas/lib/theories/puzzlesIndex.ts`, `app/puzzles/` | The puzzles page at `/puzzles`: every question by site, with its facts, its theories, and the experiments those theories list, each marked with the theory it supports or goes against. A new site adds its display name to `SITE_NAMES` there. |
| `Anatolia/atlas/scripts/check_theories.mts`, `tests/test_theories.py` | The integrity check and its pytest wrapper. |

## The four kinds of record

Philosophy principle 3 asks that facts, readings and theories stay apart. So they are separate records that point at each other by id.

**Fact.** Something measured, excavated, tried or written down at the time. It has an id, a statement, the site ids it belongs to, a kind (`measurement`, `excavation`, `experiment` or `text`) and one source. A fact carries no interpretation. Where a figure is one person's estimate, the statement says whose.

**Evidence entry.** One point that bears on a theory. It has an id, a summary of one or two sentences, a kind (the four above, or `argument`), one source, and optionally the id of the fact it rests on. An argument names who makes it (`madeBy`). An entry does not say which side it is on: the theory that lists it says that, so one entry can count for one theory and against another.

**Theory.** A claim with an owner. It has:

- `id`: a slug, lower-case words joined by hyphens, starting with the site.
- `title`, and `claim` worded as the proponents' claim.
- `proponents`: at least one name.
- `claimSources`: at least one source where the claim itself is made.
- `siteIds`: every id the app uses for the sites it touches (see below).
- `evidenceFor` and `evidenceAgainst`: lists of evidence ids.
- `wouldSettle`: what finding would settle it.
- `status` and `statusLog`: see the status rule.

**Open question.** The question, the site ids, optional walk-view landmark ids, the fact ids it rests on, and the theory ids that try to answer it. A question with no theories is valid: it is shown as "not known".

A **source** is a citation (author, year, title, where published), a kind (`excavation-report`, `peer-reviewed-paper`, `popular-book`, `project-page` or `other`) and an optional `https` address. The address is shown as a link only if its host is on the allowlist in `lib/externalHref.ts`.

## Site ids

A record lists every id the app uses for its site, because the same place has more than one. Göbekli Tepe is `gobekli-tepe` in the walk view and the Anatolia atlas and `Q214944` in the world catalogue. Giza is `Q12508` (the pyramid complex) and `Q37200` (the Great Pyramid). `theoryTouchesSite(theory, id)` answers for any of them, and `theoriesForSite` and `questionsForSite` take any of them.

Landmark ids are those of the walk view (`lib/walk/gobekliTepeLandmarks.ts`). They are unique only within a site, so `questionsForLandmark` takes the site id as well.

## The status rule

A theory's status is one rung of the ladder in `docs/philosophy.md`: `well-supported`, `contested`, `weakly-supported`, `unsupported-so-far` or `shelved`.

- `statusLog` is a list of `{ date, status, reason }`. It is append only. The current status is its last entry, and `status` must equal it.
- To change a status, add a new entry with today's date and the reason, and set `status` to match. Do not edit or remove an earlier entry. A theory is downgraded, never deleted, and it can move back up the same way.
- The reason names the evidence that moved it. The status follows from the evidence listed under the theory, not from who proposes it or how widely it is held.
- A new theory starts with one entry, made with `firstStatus(date, status, reason)`.

## Sourcing rules

- Invent nothing. Every fact, evidence entry and theory has a real citation that a reader can look up.
- Check each figure and each citation against a source you have opened. If you cannot, leave the record out.
- Give a link only if you opened it and it worked.
- Say who says what: "Schmidt read this as", "Krupp points out". The atlas does not speak in its own voice about what is true.
- Keep the wording level. No "debunked", "proves", "fringe" or "mainstream". The check script rejects these words.
- No coordinates, and no two long decimal numbers side by side.

## Adding a theory

1. Find the source where the claim is made, and open it.
2. Add any new facts and evidence entries it needs to the site's data files, each with its source. Reuse an existing entry where one fits.
3. Add the theory with its proponents, claim sources, evidence on each side, what would settle it, and `firstStatus(...)` with an honest first status and a reason. It does not need to be believed to be added.
4. Add its id to the `theoryIds` of the question it answers, or add a new question.
5. If a link's host is new, add it to `lib/externalHref.ts`.
6. Run the check below.

Adding evidence against a popular idea is as welcome as adding evidence for an unpopular one. An experiment goes in as an entry of kind `experiment`, and the card labels it, so a claim that something could not be done stands beside the trials that bear on it.

## Adding a site

Write its data files beside the others, export one `TheoryRecords` object, and add it to `SITE_RECORDS` in `theoryRegistry.ts`.

## Showing the records

`<TheoryCard theoryId="…" />` shows one theory: title, claim, who proposes it, the status with the date and reason of its last change, evidence for, evidence against (each with its kind and source), what would settle it, where the claim is made, and a collapsed status history.

`<QuestionList questionIds={[…]} onOpenTheory={(id) => …} openTheoryId={…} />` lists questions with the theories under each as buttons.

Both are plain content with no frame of their own, so they can sit inside a panel (`components/globe/chrome/PanelShell.tsx`) or a card.

`<SiteTheories siteId="…" onOpenTheory={(id) => …} />` is the "Questions and theories" section of a site card: the questions asked of that id and the theories under them, or nothing when there are none.

Where they appear in the app:

- **The globe, Theories panel** (`components/globe/chrome/TheoriesPanel.tsx`): every question, site by site, with its theories. Picking a theory shows its card and rings the sites it is about on the globe. This is the theory lens; `?view=globe&theory=<id>` opens it on one theory.
- **The globe, site card**: the section follows the record and its credit line. Picking a theory opens the Theories panel on it.
- **The Anatolia map, site panel**: the section is in the Story tab, outside the catalogue overview. Picking a theory opens its card in the panel and rings the curated sites it is about.

In none of these does a theory change what a site record says or how a site is drawn: a ring marks what a theory is about. `docs/world-atlas.md` has the detail and the hooks for browser checks.

In the walk view a question appears on the card of each landmark it names, under the tab "What we don't know" (`components/walk/LandmarkQuestions.tsx`, see `docs/world-atlas.md`).

## The check

```bash
cd Anatolia/atlas
node --experimental-strip-types scripts/check_theories.mts
```

It fails if an id is repeated or is not a slug, if a theory, question or evidence entry points at a record that does not exist, if a theory lacks a proponent, a claim source, evidence on either side or a status log whose last entry equals its status, if any record lacks a citation, if a link's host is not on the allowlist, if a question names a landmark the walk does not have, or if the wording uses a word the philosophy rules out. It also exercises the lookups and the puzzles index.

## What the seed data covers

Göbekli Tepe: how the pillars were moved; roofed or open; buried on purpose or filled by slides; what Pillar 43 shows; sanctuary or settlement. Giza: how the blocks were raised; who built the Great Pyramid and when; what it was for; why it is laid out and aligned as it is.

The first statuses were set on 2026-11-19 from the sources listed in the records. They are a starting point to be argued with, by adding evidence.
