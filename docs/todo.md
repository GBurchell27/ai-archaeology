# To do

Written 2026-11-19. The direction is in [`roadmap.md`](roadmap.md): vision and milestones M1 to M5. This file is the task list that hits them. Each task is tagged with its milestone. Background and before/after screenshots for the splat work are in `data/splat/_diagnose/overnight_log.md` (not in git). How the splats are built is in `scripts/splat/README.md`.

Features 1 to 9 and 11 of the list agreed on 2026-11-19 are built; [`world-atlas.md`](world-atlas.md) and [`theories.md`](theories.md) describe them. What remains is filed below. Ongoing work is not a milestone.

| Id | Milestone |
| --- | --- |
| [M1](roadmap.md#m1-close-the-giza-plateau) | Close the Giza plateau |
| [M2](roadmap.md#m2-hancocks-claim-and-the-published-evidence) | Hancock's claim and the published evidence |
| [M3](roadmap.md#m3-walkable-model-and-splat-sites) | Walkable model and splat sites |
| [M4](roadmap.md#m4-a-visit-that-can-be-followed) | A visit that can be followed |
| [M5](roadmap.md#m5-later-and-only-with-a-licence) | Later, and only with a licence |

M3 waits until M1's success criteria are met. M2's records for sites other than new Giza geometry may be written during M1.

## M1. Close the Giza plateau

[Milestone M1](roadmap.md#m1-close-the-giza-plateau). A separate photograph spike for the Sphinx, the Sphinx Temple and the Valley Temple is already running. It does not train a splat or change the app. Do not start a second harvest. Do not draw SAR shafts: [issue 17](https://github.com/GBurchell27/ai-archaeology/issues/17) stays out of the atlas until its own gate says otherwise.

- [ ] **M1. Giza model.** The present heights of Khafre and Menkaure, and that they lie south-west of Khufu, rest on Wikipedia; replace with a survey. Lehner, the AERA survey notes and Nell & Ruggles's full text were not read. The Sphinx, temples, causeways, boat pits and queens' pyramids are not drawn for want of a source giving both size and position. The walk ground is a 6 km GEM-15 window with a Sentinel-2 drape and the three mounds flattened (26 Nov 2026). GEM-15 at Giza was not checked against a survey, and the view was not looked at on a phone or a real GPU.
- [ ] **M1. Sphinx photograph spike.** When it reports, write the result here, including a result that a splat is not feasible. Do not train a splat or edit the walk until the owner asks.
- [ ] **M1. Great Pyramid interior, muon voids off by default.** Schematic passages from Petrie 1883, chapter 7. The ScanPyramids Big Void (Morishima and others 2017) and the north-face corridor (Procureur and others 2023) as a hypothesis layer, purpose unstated. Open both papers first, copy no figure, and add their rows to `data-sources.md`.
- [ ] **M1. Giza on a real GPU.** Frame rate, the 900 m shadow map, depth precision, walking speed (five times the other sites), and a faint horizontal line seen on Khufu's far face.

## M2. Hancock's claim and the published evidence

[Milestone M2](roadmap.md#m2-hancocks-claim-and-the-published-evidence). The owner's heading for this work is "Hancock's claim vs mainstream evidence". One record per site, or a written skip. Open the chapter. Lost-civilisation claims stay theories. In `lib/theories/` the word "mainstream" is not used: the check rejects it. The record names who says what and uses the status ladder.

- [ ] **M2. Theory records: sources read only second-hand.** The Merer papyri, Bauval & Gilbert, Hancock, Krupp, Fairall and Dunn records rest on Wikipedia or publisher blurbs; Banning 2011, Stocks 2001, Bonani et al. 2001 and Dash's 3.6 arcminutes on abstracts, press releases or a note in another paper. Read the originals or mark the records.
- [ ] **M2. Citations differ between `lib/theories/` and `lib/reading/`.** Hancock 1995's publisher (Crown or Heinemann); Clare 2020's address and pages; the kind given to Schmidt 2010; Çelik 2011's pages (241–254 or 241–253); the address forms for Karul 2021 and the Zenodo records; Wadi al-Jarf or el-Jarf; `KOCH_PROJECT_1999` names two works in one record; the NOVA entries in the reading lists lack a year. Settle each against the source.
- [ ] **M2. Theory records: first statuses.** Each is one reading of the listed evidence. The owner should review them, above all the slope-slide fill and inhabited-settlement theories (contested) and the power plant (unsupported so far).
- [ ] **M2. Göbekli Tepe and Karahan Tepe.** Hancock's claim for these two sites, from the chapter that was opened (*Magicians of the Gods* or the series, not *Fingerprints*, which is 1995). Reuse the excavators' evidence already in `lib/theories/`. The walks already exist.
- [ ] **M2. Giza claims that have no record yet.** Open the 2025 Biondi and Malanga Khafre claim and the 2026 retraction of the 2022 method paper before writing a record. Open Kunkel, *Pharaoh's Pump* (1962; revised edition 1967), before writing that record. Dunn's power plant and the Ice Age plan already have records. Draw neither shafts nor a pump.
- [ ] **M2. Gunung Padang.** Record the claim, and the retraction of Natawidjaja and others 2023 (*Archaeological Prospection*, 18 March 2024). The authors disagree with the retraction. Do not use the retracted dates as the site's date, and do not draw that pyramid. Open the Indonesian report for the hilltop terraces.
- [ ] **M2. Yonaguni.** Schoch's reading (primarily natural bedrock), Kimura's reading (shaped), and Ogata and others 2019. Open all three. Do not draw it as a building.
- [ ] **M2. Bimini Road.** Hancock's claim beside McKusick and Shinn 1980 and Gifford and Ball 1980. Open the papers before quoting an age. Do not draw it as a constructed road.
- [ ] **M2. Baalbek.** The trilithon claim beside the Roman-project reports. Open both before a status. Dimensions only from the survey that was read.
- [ ] **M2. Puma Punku and Tiwanaku.** The lost-technique claim beside the Tiwanaku reports and Protzen's trials. Open them before describing a tool.
- [ ] **M2. Sacsayhuamán.** The older-than-Inca claim beside the colonial and archaeological accounts. Open both.
- [ ] **M2. Teotihuacan.** Hancock's claim kept apart from the INAH tunnel, the reported mercury, and the robotic probe. Open those reports before stating them as facts.
- [ ] **M2. Nan Madol.** The lost-continent reading beside the Saudeleur record. Open McCoy or Athens before a date.
- [ ] **M2. Malta.** Ħal Saflieni and Ġgantija. The claim beside the Neolithic record. Acoustic claims need the study that measured them.
- [ ] **M2. Serpent Mound.** *America Before* beside the contested dates (Herrmann and others 2014, Romain and others 2017, Fletcher and others 1996, Lepper's critique). Do not pick a date on this page. A solstice alignment does not by itself date the mound.
- [ ] **M2. Derinkuyu.** The refuge claim beside a report of the cutting's date. Do not treat a portable find as a date of the tunnels.
- [ ] **M2. Stonehenge.** The 2024 Altar Stone and bluestone papers as findings, and the glacial-transport claim beside the Preseli quarry evidence. Name no quarry until the 2026 outcrop paper is opened. Any lost-civilisation claim only from a chapter that was opened.
- [ ] **M2. Machu Picchu, Carnac, Newgrange.** A Hancock record only if an opened chapter claims them. Otherwise write the skip. Newgrange's midwinter light is O'Kelly's observation, not that claim.

## M3. Walkable model and splat sites

[Milestone M3](roadmap.md#m3-walkable-model-and-splat-sites). After M1. One site at a time. Model from opened dimensions, `[EST]` where estimated. Splat only from public domain, CC0, CC BY or CC BY-SA, and only if about 40 photographs register in one model. Yonaguni and the Bimini Road are not walks.

- [ ] **M3. Stonehenge.** Environment Agency lidar (Open Government Licence v3.0) after the product page is re-read. Commons photographs, per file. No drone. Card states the 2024 stone-origin findings from M2. No source-quarry pin.
- [ ] **M3. Puma Punku and Tiwanaku.** Model first. Count openly licensed photographs before a splat. GLO-30 or GEM-15. No unregistered lidar.
- [ ] **M3. Sacsayhuamán.** Model from a surveyed plan. Commons photographs only.
- [ ] **M3. Machu Picchu.** A separate walk. No drone, tripod or commercial shoot. Commons visitor photographs only.
- [ ] **M3. Teotihuacan.** Model of the published plan. The tunnel only from the opened INAH reports, not a splat.
- [ ] **M3. Baalbek.** Trilithon and quarry megalith at the sizes the opened survey gives.
- [ ] **M3. Ġgantija.** Model, and a splat if the photograph gate passes.
- [ ] **M3. Ħal Saflieni Hypogeum.** Model from a published plan. Heritage Malta forbids photography on site. No interior splat from new photographs.
- [ ] **M3. Derinkuyu.** Model from a published plan of the underground city.
- [ ] **M3. Nan Madol.** Model only unless the photograph count clears the gate. Do not treat GLO-30 as a plan of the islets.
- [ ] **M3. Serpent Mound.** A terrain walk of the earthwork once a lidar or DEM licence is in `data-sources.md`. Not a building splat.
- [ ] **M3. Carnac.** Confirm an IGN LiDAR HD tile for the Morbihan alignments (Licence Ouverte 2.0) before download. Model of the stone rows.
- [ ] **M3. Newgrange.** Exterior model. Confirm the Meath tile in the open topographic collection (stated CC BY 4.0) before download. The light-box animation is M4.
- [ ] **M3. Gunung Padang.** Surface terraces only, from a report that is not the retracted 2023 paper. Say what that report says about the columns.

## M4. A visit that can be followed

[Milestone M4](roadmap.md#m4-a-visit-that-can-be-followed).

- [ ] **M4. Touch controls for the walk.** A phone can move and look without a keyboard. Keyboard and reduced motion stay. Known gaps notes the same hole.
- [ ] **M4. Newgrange light, or the Giza casing.** One published change tied to the playhead, source on the footer. The light-box is O'Kelly's observation. The casing is the alternative already separated in the Giza layout. A hypothesis stays off until it is switched on.
- [ ] **M4. Ice and former land.** Built from CHELSA-TraCE21k (CC0) as the "Ice and sea level" layer, off by default. Limits:
  - It gives no sea level figure: none is registered. Register a published sea level curve to show one.
  - Ice is drawn where the dataset's ice surface stands 150 m or more above the land, a threshold chosen here. The present day draws nothing.
  - The layer follows the middle of the timeline range, in steps of 500 years back to 20,000 BCE.
  - Not looked at on the real GPU.
- [ ] **M4. Sourced captions, then a Giza tour stop.** After M1. Each caption names its source. The wonders route's empty captions can be filled the same way.
- [ ] **M4. A shared walk keeps its source.** The link carries the site id and `source=photographs` when that is what is open. No coordinate. The recording-pattern layer stays out of the link.
- [ ] **M4. News: the date the list was last checked.** The list stays hand-kept. No scraper.
- [ ] **M4. Suggest a published site.** A name and a source address, moderated before it is public. No field for a latitude or a longitude. Only once sign-in exists.

## M5. Later, and only with a licence

[Milestone M5](roadmap.md#m5-later-and-only-with-a-licence). Not until Stonehenge and the next M3 site have shipped, unless the owner pulls an item forward.

- [ ] **M5. A regional atlas generated on demand.** Not built. Giza is walkable (model only).
- [ ] **M5. Çatalhöyük and Hattusa.** Not on the owner's list. Published dimensions only, estimates marked `[EST]`, photographs only under an open licence. Build only if this milestone is pulled forward.
- [ ] **M5. Further walks not on the mystery list.** Nemrut, then one court at Karnak, one approach at Petra, one enclosure at Angkor. A `data-sources.md` row before any download.
- [ ] **M5. LiDAR recall on published sites in a Maya window.** Read INEGI's terms into `data-sources.md` before any download. The score is against published sites. Shareable output is a coarse cell or a point moved by at least 5 km. No public pin. A hit is not a discovery. No restricted Maya lidar and no paid data.
- [ ] **M5. Offline shell.** Cache the app shell and the catalogue files the site already serves. Leave the splats on the network.
- [ ] **M5. Embed of one published site.** The address takes a site id. Imagery follows the basemap decision under Decisions waiting.

## Ongoing / maintenance

Not a milestone. Keep the live site, the accounts, and the walks that already exist.

### Launch: search and analytics for ancient-archaeology.com

The site went live on 2026-11-22 at https://ancient-archaeology.com. It is the Next.js app in `Anatolia/atlas`, on Vercel Pro, with the domain at GoDaddy. None of the items below is done.

- [ ] **Ongoing. Google Search Console.** Verify the domain property with a DNS TXT record at GoDaddy, then submit a sitemap. Needs the owner to add the TXT record and to submit the sitemap in Search Console.
- [ ] **Ongoing. Sitemap and robots.** `Anatolia/atlas/app/sitemap.ts` and `Anatolia/atlas/app/robots.ts` are absent, and the repo has no `sitemap.xml` or `robots.txt`. Add both through those Next.js files. The sitemap must never list candidate or undiscovered-site pages, or precise candidate coordinates. Needs the owner to confirm which published pages may be listed.
- [ ] **Ongoing. Google Analytics 4.** Create a property and add the tag (for example `@next/third-parties` `GoogleAnalytics`), with the measurement ID as an environment variable. A cookie consent banner is needed for EU visitors (GDPR and ePrivacy) unless GA is configured cookieless. Needs the owner to create the property, set the measurement ID on Vercel, and decide whether consent is required.
- [ ] **Ongoing. Vercel Web Analytics and Speed Insights,** as an alternative or an addition. Both are cookieless and included in Pro up to the plan limits. Worth comparing with Google Analytics before adding it. Needs the owner to enable them on the Vercel project, or to leave them off.
- [ ] **Ongoing. Bing Webmaster Tools.** It can import a site from Search Console. Needs the owner to sign in and import, after Search Console is verified.
- [ ] **Ongoing. Page metadata.** The root layout sets a title and a description only (`Anatolia/atlas/app/layout.tsx`). Add an Open Graph and Twitter image, a canonical URL, and structured data where it fits. Needs the owner to choose the public wording and the share image.
- [ ] **Ongoing. A privacy page,** describing the analytics if any is added. Needs the owner to name the tools and what each stores. Accounts already need a privacy notice (Decisions waiting); one page can cover both.

### User accounts: sign-in, favourites, discussions

The live site at https://ancient-archaeology.com has no database and no auth. It is the Next.js app in `Anatolia/atlas`, on Vercel Pro. Optional accounts already in the repo (Neon Auth, saved sites and votes; [`accounts.md`](accounts.md)) stay off until their settings exist, and they have not run on Vercel. Favourites on the live site, discussions, and the pages below are not built. None of the items below is done. The owner chooses whether to turn that existing path on or to use one of the stacks in the first item. Prices were read on 2026-11-23 from the Neon, Supabase, Clerk and Resend pricing pages; read them again before choosing, because the figures change. Any paid tier needs the owner's yes, and a written cost estimate, before it is turned on.

- [ ] **Ongoing. Choose an auth and database stack.** Three ways, compared briefly. Needs the owner to pick one (or to turn on the Neon path already in the repo), and to say yes to any paid tier only after a cost estimate. A marketplace install of Neon or Supabase can put later usage on the Vercel invoice, so that yes still applies.
  - **Auth.js (NextAuth) plus Postgres.** Auth.js is a library in the app, with no vendor fee. Users, favourites and discussions still need a database. Neon or Supabase can be attached from the Vercel Marketplace. Neon Free: 100 CU-hours of compute and 5 GB of network transfer per project each month, 1 GB of storage per project, and the compute scales to zero after five idle minutes. When the compute or transfer allowance is used up, that project's compute is suspended until the next month. Supabase Free, used only as Postgres: a 500 MB database, two active projects, and the project pauses after a week of inactivity. Neon's paid Launch plan is usage-based; its pricing page calls a typical spend $15 a month. Supabase Pro starts at $25 a month.
  - **Supabase Auth.** Sign-in and Postgres in one project, also available from the Vercel Marketplace. The Free plan includes 50,000 monthly active users and the same 500 MB database, and it pauses after a week of inactivity. Pro starts at $25 a month, with 100,000 monthly active users included.
  - **Clerk.** Hosted sign-in. The Hobby plan is free up to 50,000 monthly retained users per app (someone who comes back at least a day after signing up). Going past that needs a paid plan. Pro starts at $25 a month, or $20 a month billed yearly, with 50,000 retained users included. Clerk does not store favourites or comments, so a Postgres database is still required, with the Neon or Supabase limits above.
- [ ] **Ongoing. Google sign-in.** An OAuth client in Google Cloud Console, a consent screen, and redirect URIs for production (`https://ancient-archaeology.com`) and for Vercel preview deployments. The client id and secret are environment variables on Vercel, never in the repo. Needs the owner to create the client, set the consent screen, add the redirect URIs, and set the environment variables.
- [ ] **Ongoing. Email sign-in.** A magic link or a one-time code, sent by a transactional email provider (for example Resend). The sender domain is ancient-archaeology.com, which needs SPF and DKIM records in DNS at GoDaddy. Resend's free plan is 3,000 emails a month and 100 a day; Pro starts at $20 a month. The daily cap can stop sign-in mail. Needs the owner to choose magic link or code, create the provider account, add the DNS records, and approve any paid tier with a cost estimate.
- [ ] **Ongoing. Favourites.** A saved-sites table for each user, keyed by catalogue site id, a heart button on site cards, and a "My sites" list. Never store or expose coordinates of candidate or undiscovered sites. Needs the owner to confirm that only published catalogue ids may be saved, and that the list stays private to the signed-in visitor.
- [ ] **Ongoing. Discussions.** A comment thread on each site, with moderation (report, hide, ban), rate limits, and spam protection (for example Cloudflare Turnstile). A code of conduct, and a rule against posting precise locations of unpublished or vulnerable sites, because of the looting risk. Needs the owner to write the code of conduct, name who moderates, and approve the spam-protection provider.
- [ ] **Ongoing. Privacy and legal.** Privacy policy and terms pages, GDPR data export and account deletion, and a cookie notice for the session cookie. The launch list already asks for a privacy page for analytics; one page can cover both. The contact wording on public pages is exactly "contact via the contact page", and no email address is shown. Account deletion for the Neon path is already under Decisions waiting. Needs the owner to approve the policy and the terms, to decide who answers requests made through the contact page, and to confirm export and deletion before anyone signs in.
- [ ] **Ongoing. Security.** CSRF protection on the routes that change state, row-level security or an equivalent ownership check so one account cannot read or write another's rows, and every secret kept in Vercel environment variables. The Neon path already in the repo guards rows in the server and has no row-level security ([`accounts.md`](accounts.md)). Needs the owner to confirm where the secrets live, and that no key is committed.

### Sharper Göbekli Tepe photographs (the splat)

The splat is sharp only near where photographers stood. 41 of 294 downloaded photographs trained it; the rest never linked. Views from anywhere else dissolve into streaks. In rough order of value for effort:

- [ ] **Ongoing. Link more of the photographs we already have.** Structure from motion done 2026-11-19 with learned features; the splat is not retrained yet.
  - Result: 47 photographs in one model against 41 (52 with five SIFT-only close-ups merged back). 11 wide views gained. The close-ups of single pillars still do not link to the wide views. Expect a few more sharp directions from the walkway, not close-up coverage. Detail in `scripts/splat/README.md`, step 2.
  - Left: train in Brush on `data/splat/gobekli-tepe-aliked/train` with nothing else heavy running, convert, compare with the published splat, and replace it only if it is better. The system stopped the first training run for low memory.
  - Karahan Tepe was not tried.
  - The plan as written before the run:
  - Rerun COLMAP with learned features in place of SIFT: `--FeatureExtraction.type ALIKED_N16ROT` (or `ALIKED_N32`) and a LightGlue matcher (`--FeatureMatching.type`, see `colmap exhaustive_matcher -h`). They match across much larger changes of angle and light.
  - Needs four small ONNX model files from COLMAP's GitHub releases (the URLs are the defaults of the `*_model_path` options). Record the download in `docs/data-sources.md`.
  - Use the roofed-era photographs only (2018 and later) and drop stitched panoramas.
  - Then undistort, train in Brush (`--sh-degree 0`), convert with the evidence cull, realign, and move the landmark positions (`PHOTOGRAPHS_POSITIONS_M` in `Anatolia/atlas/lib/walk/gobekliTepeLandmarks.ts`; scripts in `data/splat/_diagnose/landmarks/`).
  - Expect: more sharp directions around Enclosures B, C and D. Not every angle.
- [x] **Ongoing. Hide what the photographs never saw.** Built 2026-11-19: the whole splat fades with distance from the nearest training camera (full within 6 m, gone at 22 m), and the camera positions are marked and can be stepped between.
  - [ ] **Ongoing.** The fade is one opacity for the whole scene, so the aerial overview is lost. `SHARP_WITHIN_M` and `GONE_BEYOND_M` in `lib/walk/photoViewpoints.ts` are the dial.
  - [ ] **Ongoing.** It patches one line of drei 10.7's splat shader: recheck on an upgrade.
  - [ ] **Ongoing.** In the photographs a landmark card sometimes shows after a viewpoint step and is gone within a second. Not investigated.
- [ ] **Ongoing. A trainer built for tourist photographs.** Needs an NVIDIA GPU; this machine has none. A rented one means an account and uploading the photographs: see Decisions waiting.
  - Candidates: nerfstudio `splatfacto-w` or another "in the wild" Gaussian-splat method (per-photo appearance), with depth or normal regularisation against floaters.
  - Brush, used now, treats all photographs as one consistent scene and has no such guidance.
- [ ] **Ongoing. Better source material.** The real fix.
  - A continuous video walk round the visitor walkway, or a few hundred overlapping photographs from one visit. Own footage, or footage with permission.
  - No openly licensed video of either site was found (Commons, Openverse, Europeana, Internet Archive).
  - Searched again on 2026-11-21 beyond Commons (nothing downloaded, no image opened). Found for Göbekli Tepe:
    - Flickr: about 25 photographs from one visit in April 2022 by one photographer, and 6 from August 2019 by another, all CC BY-SA 2.0. Flickr's terms forbid scraping, so a fetch needs a Flickr API key.
    - Sketchfab: a mesh "from about 400 images" (2019, CC BY 4.0), mirrored on Zenodo as one 176 MB file. The photographs are not offered, and whether it shows the roof is unconfirmed.
    - Pexels: about 25 photographs under Pexels' own licence, which is not Creative Commons and forbids automated collection.
  - Found for Karahan Tepe: seven Commons photographs of the porthole stone area uploaded in August 2025 (CC BY-SA 4.0), not of the three modelled structures.
  - Nothing usable: the German Archaeological Institute's Arachne (no derivatives), Zenodo, Figshare, Dataverse, Europeana, OpenHeritage3D, Openverse, Panoramax. Mapillary and KartaView could not be checked.

### Karahan Tepe photographs

- [ ] **Ongoing.** The splat is a fragment from 17 photographs; open sources have no more site imagery. Tasks 1, 3 and 4 above apply here too.
- [ ] **Ongoing.** Decide on the Sketchfab models: a whole-site model under CC BY (built from someone else's drone footage, so its licence is unverified) and per-structure models under CC BY-NC-SA. Download needs a signed-in account.

### Publishing on Vercel

[`deploy.md`](deploy.md) has the settings and the steps. The production build passes and was run locally as a hosted copy would run; nothing has been deployed.

- [ ] **Ongoing. Not verified on Vercel.** On the first deploy, read the build log for the size of the close-up function (a few megabytes expected; the exclusion in `next.config.ts` cannot be seen working on Windows) and go through the checks in `deploy.md`. The share page traces the detail shards into its function; check that size on the first deploy too.
- [ ] **Ongoing. Share previews were not opened in WhatsApp, X or LinkedIn.** The page, the copy toast and one generated card were checked locally. A live crawler can still cache an old card or refuse the image.
- [ ] **Ongoing.** Vercel's terms on who may use the free plan were not read.

### Accounts (optional sign-in, saved sites, votes)

[`accounts.md`](accounts.md) has what is stored, the schema, the settings and the setup steps. Accounts run on Neon (Neon Auth and Postgres) behind the atlas's own server routes, and are off until three server settings are present. On 2026-11-19 they were run against the real Neon project from a production build on this machine, with one throwaway account, since deleted.

- [ ] **Ongoing. Google sign-in has never been completed.** It needs a person at a browser. The return from Google (`neon_auth_session_verifier` on the address, kept by `lib/account/accountClient.ts`) is the least certain part.
- [ ] **Ongoing. Nobody has signed in with a correct emailed code,** and a first sign-in by code for an address with no account was not tried. Sending a code and refusing a wrong one were seen.
- [ ] **Ongoing. Not run on Vercel.** The account routes ran under `next start` only.
- [ ] **Ongoing. Tried with one account.** That a visitor cannot reach another's rows rests on the check script, not on a test with two accounts.
- [ ] **Ongoing.** The dev server's address `http://127.0.0.1:43127` is not an origin Neon Auth trusts, so a sign-in from it is refused; `http://localhost:43127` is trusted. Add the first as a trusted domain or use the second (`accounts.md`, "Setting it up").
- [ ] **Ongoing.** `@neon/auth` asks for Next 16. It is installed beside Next 15 through an `overrides` entry in `package.json` and was seen to work. Remove the entry when the atlas moves to Next 16.
- [ ] **Ongoing. Trip planning** (a route through saved sites) was raised and not built.

### The rest of the built list

- [ ] **Ongoing. Reading lists: details not confirmed.** Pages for Clare 2020, Notroff et al. 2017, Sweatman & Tsikritsis 2017 and Hauptmann 1993 and 1999; the one-line notes on the books are descriptions, not quotations. The Tepe Telegrams blog would not open and is left out.
- [ ] **Ongoing. Follow links.** Owner: collect the social accounts. Only official project pages are listed; the place for accounts is the end of `FOLLOW_LINKS` in `lib/reading/followLinks.ts`.
- [ ] **Ongoing. Named periods.** Only Anatolia and Egypt have a table. Pottery Neolithic, Chalcolithic, Early Bronze Age and the Hittite Old Kingdom and Empire split are left out because no source would open. Hittite and Phrygian dates are one site's sequence (Gordion). The Younger Dryas dates come from a handout reproducing Rasmussen et al. 2014, not the article.
- [ ] **Ongoing. Settings panel.** The place view has none. "Megaliths only" does nothing on the Anatolia map, which has no site type filter.

### Decisions waiting

- [ ] **Ongoing. Accounts:** read the privacy notice at `/privacy` before real visitors sign in. It was drafted from `accounts.md`, is not legal advice, and says the data is kept in the United States (AWS Ohio), read from the database address.
- [ ] **Ongoing. Accounts:** before real visitors, Neon's production checklist: your own Google OAuth credentials, your own mail sender, the application name, the deployed address as a trusted domain, and "Allow localhost" off (`accounts.md`, "Before real visitors sign in").
- [ ] **Ongoing. Accounts:** `neon init` declared a sample function (`Anatolia/atlas/hello.ts`) and a private storage bucket (`assets`) in `Anatolia/atlas/neon.ts`. The atlas uses neither. Remove both, or keep them?
- [ ] **Ongoing. Accounts:** OpenStreetMap megaliths cannot be saved or voted for, to keep share-alike records out of the lists. Keep, or allow them?
- [ ] **Ongoing. Accounts:** a visitor may vote for any number of sites. Keep, or cap it?
- [ ] **Ongoing.** Publish on Vercel with terrain close-ups switched off? They need the repository's Python, which Vercel's Node functions do not have. `deploy.md` lists four ways to bring them back and what each costs.
- [ ] **Ongoing.** Commit the Şanlıurfa regional files (`Anatolia/atlas/public/terrain/regions/`, 12 files, 2.7 MB, ignored by git today)? Without them the hosted Anatolia map has no 120 m block around Şanlıurfa. They derive from Copernicus GLO-30 and Sentinel-2, and their source files are already tracked under `Anatolia/explorer/public/terrain/`. It needs the ignore line removed and an exception for `height.u16`.
- [ ] **Ongoing.** Globe imagery on a public site: decided 2026-11-21, a copy built on Vercel opens on NASA Blue Marble. Still open: a visitor can pick Sentinel-2 (EOX) in the settings there, and the Anatolia map's satellite layer is an EOX mosaic (CC BY-NC-SA) served from this repository. Keep both, or remove them from the hosted copy?
- [ ] **Ongoing.** Rerun the Brush training that the system stopped for low memory (about half an hour, nothing else heavy running).
- [ ] **Ongoing.** Rent an NVIDIA GPU for a trainer built for tourist photographs. It needs an account and the photographs uploaded to the provider.
- [ ] **Ongoing.** Better footage of either site has to be the owner's own, or footage with permission.
- [ ] **Ongoing.** PaleoMIST ice sheet reconstructions (3.5 GB): the host forbids scripted download, so the owner would fetch it by hand. Worth it?
- [ ] **Ongoing.** The "Ice and sea level" layer gives no sea level figure. Rename it, or register a sea level curve. The work, if it goes ahead, is M4.
- [ ] **Ongoing.** Satellite as the terrain map's default base. Compare `map_review_2/after/9_turkey_satellite.png` with `8_globe.png`.
- [ ] **Ongoing.** Shelter roof in the Göbekli Tepe splat: the streak cull removed its far side. The uncut file is `data/splat/gobekli-tepe/gobekli-tepe.hd-unculled.splat`.
- [ ] **Ongoing.** Browser Back after "← Anatolia map" returns to the walk. Keep or skip that entry.
- [ ] **Ongoing.** A globe card for a site the map does not have opens the map with nothing selected and no message.
- [ ] **Ongoing.** Karahan Tepe: a walker who starts in Structure AD cannot leave on foot, because no entrance is published and none is drawn. Keep, or add a labelled way out.
- [ ] **Ongoing.** Late Bronze Age collapse is shown as a worldwide period chip, though it is an eastern Mediterranean event.
- [ ] **Ongoing.** The splat is fully faded 22 m from every camera. Keep, or leave a faint overview for a flyer.

### Check on the real GPU

Everything overnight was judged in a software-rendered test browser. The Giza line is M1.

- [ ] **Ongoing.** Frame rate in Göbekli Tepe's Photographs mode (872,000 splats) and in both models.
- [ ] **Ongoing.** Collision and keyboard turning (arrows, Page Up and Page Down) together with mouse look.
- [ ] **Ongoing.** The lifted site windows at Sayburç, Nevalı Çori and Harran.
- [ ] **Ongoing.** Mouse look, the dive transition, and the pixel ratio settling without visible resizing.
- [ ] **Ongoing.** Zooming into a site from the map must arrive walking, not flying (R recovers it).
- [ ] **Ongoing.** Thin dotted vertical lines on Karahan Tepe's built east wall: real, or a test-renderer artefact?
- [ ] **Ongoing.** Play history on the globe timeline and the Anatolia year bar was looked at in a software-rendered browser only.
- [ ] **Ongoing.** News rings on the globe. Seen in a software-rendered browser only. The pulse is CSS; under reduced motion the ring stays still.

### Known gaps

- [ ] **Ongoing.** `PlaceTerrainError` (`lib/place/placeTerrain.ts`) and `ReliefFetchError` (`lib/placeTerrainLoad.ts`) still use TypeScript parameter properties. No `scripts/check_*.mts` loads those files, so Node's type stripping does not see them. Give them ordinary fields if a check starts importing them.
- [ ] **Ongoing.** Collision is for a walker in the models only. Göbekli Tepe's benches and pedestals are walked through. Touch input is M4.
- [ ] **Ongoing.** The repeat-visit fix for the splat (`components/walk/SiteSplat.tsx`) relies on drei 10.7 internals: recheck on an upgrade.

### Accuracy to confirm against the sources

Checked on 2026-11-19 against Haklay & Gopher 2020, Karul 2021 and Schmidt 2010 as published. Still open:

- [ ] **Ongoing.** Göbekli Tepe: Enclosures D and C are oval but only a maximum diameter is published (14 m, 11 m), so both are drawn as circles.
- [ ] **Ongoing.** Karahan Tepe: Structure AB stays 2.3 m deep, read by eye off the scale bar of Karul 2021 Fig. 8; the 3.5 m is on the Taş Tepeler page only.
- [ ] **Ongoing.** Karahan Tepe: Structure AD's pillar heights and the porthole's height are in no source found.
- [ ] **Ongoing.** Karahan Tepe: Karul 2021 Fig. 3 suggests AD is about 19 m east to west, against the 23 m circle drawn; Fig. 2 suggests AB sits on AD's north-south axis, not 3 m west.
- [ ] **Ongoing.** Karahan Tepe: no open excavation report later than 2021 was found.
