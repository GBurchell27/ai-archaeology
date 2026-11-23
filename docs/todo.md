# To do

Written 2026-11-19. Background and before/after screenshots for everything here are in `data/splat/_diagnose/overnight_log.md` (not in git). How the splats are built is in `scripts/splat/README.md`.

## Features built on 2026-11-19, and what is left of each

Features 1 to 9 and 11 of the list agreed on 2026-11-19 are built; [`world-atlas.md`](world-atlas.md) and [`theories.md`](theories.md) describe them. Everything was judged in a software-rendered test browser. What remains:

- [ ] **Theory records: sources read only second-hand.** The Merer papyri, Bauval & Gilbert, Hancock, Krupp, Fairall and Dunn records rest on Wikipedia or publisher blurbs; Banning 2011, Stocks 2001, Bonani et al. 2001 and Dash's 3.6 arcminutes on abstracts, press releases or a note in another paper. Read the originals or mark the records.
- [ ] **Citations differ between `lib/theories/` and `lib/reading/`.** Hancock 1995's publisher (Crown or Heinemann); Clare 2020's address and pages; the kind given to Schmidt 2010; Çelik 2011's pages (241–254 or 241–253); the address forms for Karul 2021 and the Zenodo records; Wadi al-Jarf or el-Jarf; `KOCH_PROJECT_1999` names two works in one record; the NOVA entries in the reading lists lack a year. Settle each against the source.
- [ ] **Theory records: first statuses.** Each is one reading of the listed evidence. The owner should review them, above all the slope-slide fill and inhabited-settlement theories (contested) and the power plant (unsupported so far).
- [ ] **Reading lists: details not confirmed.** Pages for Clare 2020, Notroff et al. 2017, Sweatman & Tsikritsis 2017 and Hauptmann 1993 and 1999; the one-line notes on the books are descriptions, not quotations. The Tepe Telegrams blog would not open and is left out.
- [ ] **6. Follow links. Owner:** collect the social accounts. Only official project pages are listed; the place for accounts is the end of `FOLLOW_LINKS` in `lib/reading/followLinks.ts`.
- [ ] **4. Named periods.** Only Anatolia and Egypt have a table. Pottery Neolithic, Chalcolithic, Early Bronze Age and the Hittite Old Kingdom and Empire split are left out because no source would open. Hittite and Phrygian dates are one site's sequence (Gordion). The Younger Dryas dates come from a handout reproducing Rasmussen et al. 2014, not the article.
- [ ] **9. Ice and former land on the globe.** Built from CHELSA-TraCE21k (CC0) as the "Ice and sea level" layer, off by default. Limits:
  - It gives no sea level figure: none is registered. Register a published sea level curve to show one.
  - Ice is drawn where the dataset's ice surface stands 150 m or more above the land, a threshold chosen here. The present day draws nothing.
  - The layer follows the middle of the timeline range, in steps of 500 years back to 20,000 BCE.
  - Not looked at on the real GPU.
- [ ] **10. A regional atlas generated on demand.** Not built. Giza is walkable (model only).
- [ ] **10. Giza model.** The present heights of Khafre and Menkaure, and that they lie south-west of Khufu, rest on Wikipedia; replace with a survey. Lehner, the AERA survey notes and Nell & Ruggles's full text were not read. The Sphinx, temples, causeways, boat pits and queens' pyramids are not drawn for want of a source giving both size and position.
- [ ] **5. Settings panel.** The place view has none. "Megaliths only" does nothing on the Anatolia map, which has no site type filter.

## Launch: search and analytics for ancient-archaeology.com

The site went live on 2026-11-22 at https://ancient-archaeology.com. It is the Next.js app in `Anatolia/atlas`, on Vercel Pro, with the domain at GoDaddy. None of the items below is done.

- [ ] **Google Search Console.** Verify the domain property with a DNS TXT record at GoDaddy, then submit a sitemap. Needs the owner to add the TXT record and to submit the sitemap in Search Console.
- [ ] **Sitemap and robots.** `Anatolia/atlas/app/sitemap.ts` and `Anatolia/atlas/app/robots.ts` are absent, and the repo has no `sitemap.xml` or `robots.txt`. Add both through those Next.js files. The sitemap must never list candidate or undiscovered-site pages, or precise candidate coordinates. Needs the owner to confirm which published pages may be listed.
- [ ] **Google Analytics 4.** Create a property and add the tag (for example `@next/third-parties` `GoogleAnalytics`), with the measurement ID as an environment variable. A cookie consent banner is needed for EU visitors (GDPR and ePrivacy) unless GA is configured cookieless. Needs the owner to create the property, set the measurement ID on Vercel, and decide whether consent is required.
- [ ] **Vercel Web Analytics and Speed Insights,** as an alternative or an addition. Both are cookieless and included in Pro up to the plan limits. Worth comparing with Google Analytics before adding it. Needs the owner to enable them on the Vercel project, or to leave them off.
- [ ] **Bing Webmaster Tools.** It can import a site from Search Console. Needs the owner to sign in and import, after Search Console is verified.
- [ ] **Page metadata.** The root layout sets a title and a description only (`Anatolia/atlas/app/layout.tsx`). Add an Open Graph and Twitter image, a canonical URL, and structured data where it fits. Needs the owner to choose the public wording and the share image.
- [ ] **A privacy page,** describing the analytics if any is added. Needs the owner to name the tools and what each stores. Accounts already need a privacy notice (Decisions waiting); one page can cover both.

## User accounts: sign-in, favourites, discussions

The live site at https://ancient-archaeology.com has no database and no auth. It is the Next.js app in `Anatolia/atlas`, on Vercel Pro. Optional accounts already in the repo (Neon Auth, saved sites and votes; [`accounts.md`](accounts.md)) stay off until their settings exist, and they have not run on Vercel. Favourites on the live site, discussions, and the pages below are not built. None of the items below is done. The owner chooses whether to turn that existing path on or to use one of the stacks in the first item. Prices were read on 2026-11-23 from the Neon, Supabase, Clerk and Resend pricing pages; read them again before choosing, because the figures change. Any paid tier needs the owner's yes, and a written cost estimate, before it is turned on.

- [ ] **Choose an auth and database stack.** Three ways, compared briefly. Needs the owner to pick one (or to turn on the Neon path already in the repo), and to say yes to any paid tier only after a cost estimate. A marketplace install of Neon or Supabase can put later usage on the Vercel invoice, so that yes still applies.
  - **Auth.js (NextAuth) plus Postgres.** Auth.js is a library in the app, with no vendor fee. Users, favourites and discussions still need a database. Neon or Supabase can be attached from the Vercel Marketplace. Neon Free: 100 CU-hours of compute and 5 GB of network transfer per project each month, 1 GB of storage per project, and the compute scales to zero after five idle minutes. When the compute or transfer allowance is used up, that project's compute is suspended until the next month. Supabase Free, used only as Postgres: a 500 MB database, two active projects, and the project pauses after a week of inactivity. Neon's paid Launch plan is usage-based; its pricing page calls a typical spend $15 a month. Supabase Pro starts at $25 a month.
  - **Supabase Auth.** Sign-in and Postgres in one project, also available from the Vercel Marketplace. The Free plan includes 50,000 monthly active users and the same 500 MB database, and it pauses after a week of inactivity. Pro starts at $25 a month, with 100,000 monthly active users included.
  - **Clerk.** Hosted sign-in. The Hobby plan is free up to 50,000 monthly retained users per app (someone who comes back at least a day after signing up). Going past that needs a paid plan. Pro starts at $25 a month, or $20 a month billed yearly, with 50,000 retained users included. Clerk does not store favourites or comments, so a Postgres database is still required, with the Neon or Supabase limits above.
- [ ] **Google sign-in.** An OAuth client in Google Cloud Console, a consent screen, and redirect URIs for production (`https://ancient-archaeology.com`) and for Vercel preview deployments. The client id and secret are environment variables on Vercel, never in the repo. Needs the owner to create the client, set the consent screen, add the redirect URIs, and set the environment variables.
- [ ] **Email sign-in.** A magic link or a one-time code, sent by a transactional email provider (for example Resend). The sender domain is ancient-archaeology.com, which needs SPF and DKIM records in DNS at GoDaddy. Resend's free plan is 3,000 emails a month and 100 a day; Pro starts at $20 a month. The daily cap can stop sign-in mail. Needs the owner to choose magic link or code, create the provider account, add the DNS records, and approve any paid tier with a cost estimate.
- [ ] **Favourites.** A saved-sites table for each user, keyed by catalogue site id, a heart button on site cards, and a "My sites" list. Never store or expose coordinates of candidate or undiscovered sites. Needs the owner to confirm that only published catalogue ids may be saved, and that the list stays private to the signed-in visitor.
- [ ] **Discussions.** A comment thread on each site, with moderation (report, hide, ban), rate limits, and spam protection (for example Cloudflare Turnstile). A code of conduct, and a rule against posting precise locations of unpublished or vulnerable sites, because of the looting risk. Needs the owner to write the code of conduct, name who moderates, and approve the spam-protection provider.
- [ ] **Privacy and legal.** Privacy policy and terms pages, GDPR data export and account deletion, and a cookie notice for the session cookie. The launch list already asks for a privacy page for analytics; one page can cover both. The contact wording on public pages is exactly "contact via the contact page", and no email address is shown. Account deletion for the Neon path is already under Decisions waiting. Needs the owner to approve the policy and the terms, to decide who answers requests made through the contact page, and to confirm export and deletion before anyone signs in.
- [ ] **Security.** CSRF protection on the routes that change state, row-level security or an equivalent ownership check so one account cannot read or write another's rows, and every secret kept in Vercel environment variables. The Neon path already in the repo guards rows in the server and has no row-level security ([`accounts.md`](accounts.md)). Needs the owner to confirm where the secrets live, and that no key is committed.

## Sharper Göbekli Tepe photographs (the splat)

The splat is sharp only near where photographers stood. 41 of 294 downloaded photographs trained it; the rest never linked. Views from anywhere else dissolve into streaks. In rough order of value for effort:

- [ ] **1. Link more of the photographs we already have.** Structure from motion done 2026-11-19 with learned features; the splat is not retrained yet.
  - Result: 47 photographs in one model against 41 (52 with five SIFT-only close-ups merged back). 11 wide views gained. The close-ups of single pillars still do not link to the wide views. Expect a few more sharp directions from the walkway, not close-up coverage. Detail in `scripts/splat/README.md`, step 2.
  - Left: train in Brush on `data/splat/gobekli-tepe-aliked/train` with nothing else heavy running, convert, compare with the published splat, and replace it only if it is better. The system stopped the first training run for low memory.
  - Karahan Tepe was not tried.
  - The plan as written before the run:
  - Rerun COLMAP with learned features in place of SIFT: `--FeatureExtraction.type ALIKED_N16ROT` (or `ALIKED_N32`) and a LightGlue matcher (`--FeatureMatching.type`, see `colmap exhaustive_matcher -h`). They match across much larger changes of angle and light.
  - Needs four small ONNX model files from COLMAP's GitHub releases (the URLs are the defaults of the `*_model_path` options). Record the download in `docs/data-sources.md`.
  - Use the roofed-era photographs only (2018 and later) and drop stitched panoramas.
  - Then undistort, train in Brush (`--sh-degree 0`), convert with the evidence cull, realign, and move the landmark positions (`PHOTOGRAPHS_POSITIONS_M` in `Anatolia/atlas/lib/walk/gobekliTepeLandmarks.ts`; scripts in `data/splat/_diagnose/landmarks/`).
  - Expect: more sharp directions around Enclosures B, C and D. Not every angle.
- [x] **2. Hide what the photographs never saw.** Built 2026-11-19: the whole splat fades with distance from the nearest training camera (full within 6 m, gone at 22 m), and the camera positions are marked and can be stepped between.
  - [ ] The fade is one opacity for the whole scene, so the aerial overview is lost. `SHARP_WITHIN_M` and `GONE_BEYOND_M` in `lib/walk/photoViewpoints.ts` are the dial.
  - [ ] It patches one line of drei 10.7's splat shader: recheck on an upgrade.
  - [ ] In the photographs a landmark card sometimes shows after a viewpoint step and is gone within a second. Not investigated.
- [ ] **3. A trainer built for tourist photographs.** Needs an NVIDIA GPU; this machine has none. A rented one means an account and uploading the photographs: see Decisions waiting.
  - Candidates: nerfstudio `splatfacto-w` or another "in the wild" Gaussian-splat method (per-photo appearance), with depth or normal regularisation against floaters.
  - Brush, used now, treats all photographs as one consistent scene and has no such guidance.
- [ ] **4. Better source material.** The real fix.
  - A continuous video walk round the visitor walkway, or a few hundred overlapping photographs from one visit. Own footage, or footage with permission.
  - No openly licensed video of either site was found (Commons, Openverse, Europeana, Internet Archive).

## Karahan Tepe photographs

- [ ] The splat is a fragment from 17 photographs; open sources have no more site imagery. Tasks 1, 3 and 4 above apply here too.
- [ ] Decide on the Sketchfab models: a whole-site model under CC BY (built from someone else's drone footage, so its licence is unverified) and per-structure models under CC BY-NC-SA. Download needs a signed-in account.

## Publishing on Vercel

[`deploy.md`](deploy.md) has the settings and the steps. The production build passes and was run locally as a hosted copy would run; nothing has been deployed.

- [ ] **Not verified on Vercel.** On the first deploy, read the build log for the size of the close-up function (a few megabytes expected; the exclusion in `next.config.ts` cannot be seen working on Windows) and go through the checks in `deploy.md`.
- [ ] **The globe's EOX credit uses the earlier wording.** EOX's licence page now gives `EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data "year")`. Update `lib/globe/basemaps.ts` and the row in `data-sources.md`.
- [ ] **Two controls still lead to the close-up API on a hosted copy:** "View terrain" on a globe site card (it opens the place view's "not available here" message) and "Relief close-up" in the Anatolia site panel's Resources (it opens the plain 503 text). Hide both where close-ups are off.
- [ ] Vercel's terms on who may use the free plan were not read.

## Accounts (optional sign-in, saved sites, votes)

[`accounts.md`](accounts.md) has what is stored, the schema, the settings and the setup steps. Accounts run on Neon (Neon Auth and Postgres) behind the atlas's own server routes, and are off until three server settings are present. On 2026-11-19 they were run against the real Neon project from a production build on this machine, with one throwaway account, since deleted.

- [ ] **Google sign-in has never been completed.** It needs a person at a browser. The return from Google (`neon_auth_session_verifier` on the address, kept by `lib/account/accountClient.ts`) is the least certain part.
- [ ] **Nobody has signed in with a correct emailed code,** and a first sign-in by code for an address with no account was not tried. Sending a code and refusing a wrong one were seen.
- [ ] **Not run on Vercel.** The account routes ran under `next start` only.
- [ ] **Tried with one account.** That a visitor cannot reach another's rows rests on the check script, not on a test with two accounts.
- [ ] The dev server's address `http://127.0.0.1:43127` is not an origin Neon Auth trusts, so a sign-in from it is refused; `http://localhost:43127` is trusted. Add the first as a trusted domain or use the second (`accounts.md`, "Setting it up").
- [ ] `@neon/auth` asks for Next 16. It is installed beside Next 15 through an `overrides` entry in `package.json` and was seen to work. Remove the entry when the atlas moves to Next 16.
- [ ] Trip planning (a route through saved sites) was raised and not built.

## Decisions waiting

- [ ] Accounts: a privacy notice is needed before real visitors sign in, because Neon will hold their email addresses, the IP address and browser name of each session and, with Google, their profile name and picture. Where the project is hosted (region) belongs in it.
- [ ] Accounts: before real visitors, Neon's production checklist: your own Google OAuth credentials, your own mail sender, the application name, the deployed address as a trusted domain, and "Allow localhost" off (`accounts.md`, "Before real visitors sign in").
- [ ] Accounts: deleting an account is done by hand with `neon neon-auth user delete`. Neon Auth's own delete route answered 404, so a "Delete my account" button needs a server route that deletes the `neon_auth` user row itself. Add it, or keep deletion by request?
- [ ] Accounts: `neon init` declared a sample function (`Anatolia/atlas/hello.ts`) and a private storage bucket (`assets`) in `Anatolia/atlas/neon.ts`. The atlas uses neither. Remove both, or keep them?
- [ ] Accounts: OpenStreetMap megaliths cannot be saved or voted for, to keep share-alike records out of the lists. Keep, or allow them?
- [ ] Accounts: a visitor may vote for any number of sites. Keep, or cap it?
- [ ] Publish on Vercel with terrain close-ups switched off? They need the repository's Python, which Vercel's Node functions do not have. `deploy.md` lists four ways to bring them back and what each costs.
- [ ] Commit the Şanlıurfa regional files (`Anatolia/atlas/public/terrain/regions/`, 12 files, 2.7 MB, ignored by git today)? Without them the hosted Anatolia map has no 120 m block around Şanlıurfa. They derive from Copernicus GLO-30 and Sentinel-2, and their source files are already tracked under `Anatolia/explorer/public/terrain/`. It needs the ignore line removed and an exception for `height.u16`.
- [ ] The default globe imagery on a public site. EOX's licence allows non-commercial use with the credit shown, and its tile service calls itself a demo service with rate limiting; no page read says a public website may use the free endpoint. Keep it, ask EOX, or make NASA Blue Marble (no restriction read) the default for the hosted copy.

- [ ] Rerun the Brush training that the system stopped for low memory (about half an hour, nothing else heavy running).
- [ ] Rent an NVIDIA GPU for a trainer built for tourist photographs. It needs an account and the photographs uploaded to the provider.
- [ ] Better footage of either site has to be the owner's own, or footage with permission.
- [ ] PaleoMIST ice sheet reconstructions (3.5 GB): the host forbids scripted download, so the owner would fetch it by hand. Worth it?
- [ ] The "Ice and sea level" layer gives no sea level figure. Rename it, or register a sea level curve.
- [ ] Satellite as the terrain map's default base. Compare `map_review_2/after/9_turkey_satellite.png` with `8_globe.png`.
- [ ] Shelter roof in the Göbekli Tepe splat: the streak cull removed its far side. The uncut file is `data/splat/gobekli-tepe/gobekli-tepe.hd-unculled.splat`.
- [ ] Browser Back after "← Anatolia map" returns to the walk. Keep or skip that entry.
- [ ] A globe card for a site the map does not have opens the map with nothing selected and no message.
- [ ] Karahan Tepe: a walker who starts in Structure AD cannot leave on foot, because no entrance is published and none is drawn. Keep, or add a labelled way out.
- [ ] Late Bronze Age collapse is shown as a worldwide period chip, though it is an eastern Mediterranean event.
- [ ] The splat is fully faded 22 m from every camera. Keep, or leave a faint overview for a flyer.

## Check on the real GPU

Everything overnight was judged in a software-rendered test browser.

- [ ] Frame rate in Göbekli Tepe's Photographs mode (872,000 splats) and in both models.
- [ ] Giza: frame rate, the 900 m shadow map, depth precision, walking speed (five times the other sites), and a faint horizontal line seen on Khufu's far face.
- [ ] Collision and keyboard turning (arrows, Page Up and Page Down) together with mouse look.
- [ ] The lifted site windows at Sayburç, Nevalı Çori and Harran.
- [ ] Mouse look, the dive transition, and the pixel ratio settling without visible resizing.
- [ ] Zooming into a site from the map must arrive walking, not flying (R recovers it).
- [ ] Thin dotted vertical lines on Karahan Tepe's built east wall: real, or a test-renderer artefact?
- [ ] Play history on the globe timeline and the Anatolia year bar was looked at in a software-rendered browser only.
- [ ] News rings on the globe. Seen in a software-rendered browser only. The pulse is CSS; under reduced motion the ring stays still.

## Known gaps

- [ ] `PlaceTerrainError` (`lib/place/placeTerrain.ts`) and `ReliefFetchError` (`lib/placeTerrainLoad.ts`) still use TypeScript parameter properties. No `scripts/check_*.mts` loads those files, so Node's type stripping does not see them. Give them ordinary fields if a check starts importing them.
- [ ] Collision is for a walker in the models only. Göbekli Tepe's benches and pedestals are walked through, and there is no touch input.
- [ ] The repeat-visit fix for the splat (`components/walk/SiteSplat.tsx`) relies on drei 10.7 internals: recheck on an upgrade.

## Accuracy to confirm against the sources

Checked on 2026-11-19 against Haklay & Gopher 2020, Karul 2021 and Schmidt 2010 as published. Still open:

- [ ] Göbekli Tepe: Enclosures D and C are oval but only a maximum diameter is published (14 m, 11 m), so both are drawn as circles.
- [ ] Karahan Tepe: Structure AB stays 2.3 m deep, read by eye off the scale bar of Karul 2021 Fig. 8; the 3.5 m is on the Taş Tepeler page only.
- [ ] Karahan Tepe: Structure AD's pillar heights and the porthole's height are in no source found.
- [ ] Karahan Tepe: Karul 2021 Fig. 3 suggests AD is about 19 m east to west, against the 23 m circle drawn; Fig. 2 suggests AB sits on AD's north-south axis, not 3 m west.
- [ ] Karahan Tepe: no open excavation report later than 2021 was found.
