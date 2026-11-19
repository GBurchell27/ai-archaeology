# Accounts

The atlas is open: a visitor lands on the globe and uses all of it without signing in. Signing in is optional. It gives a visitor two lists (sites they want to visit, sites they have visited) and a vote for the places they find most remarkable. The votes add up to a public "Most voted" list. It is free, and there is nothing to pay for.

The feature is built and its logic is checked, but **it has never been run against a real service**, and nobody has ever signed in. No Supabase project exists yet. See "What is untested" before relying on any of it.

Paths are relative to `Anatolia/atlas` unless they start with `docs/` or `tests/`.

## The three states

| State | What the visitor sees |
| --- | --- |
| **Not configured** (either setting below is absent) | The atlas exactly as it was. No account button, no controls on a site card, no "Most voted". The Supabase code is not downloaded and no request is made. |
| **Configured, signed out** | "Most voted" and "Sign in" in the globe's top bar. A site card has "Want to visit", "Visited" and "Vote"; pressing one opens the sign-in. The "Most voted" list is readable. |
| **Signed in** | "Sign in" becomes "Account": the two lists, whose rows open the site on the globe, with "Sign out" and "Delete my saved data". The buttons on a site card save, move, remove and vote. |

Accounts exist only on the globe. The Anatolia map, the place view and the walk have no account controls.

## What is stored

- In the two tables of this project: the id Supabase gives the account, a site id, for a saved site which of the two lists it is on, and the time the row was made. Nothing else. No coordinates, no names, no free text. A site id is a published catalogue id, the same one an address carries (`?site=Q214944`).
- By Supabase's sign-in service, in its own `auth.users` table: the email address the visitor signs in with. With Google, also the name and picture of the Google profile, which Google sends with the sign-in. The atlas reads only the email, to show the visitor which account they are in. It shows none of this to anyone else.
- In the visitor's browser: the session, in local storage, so they stay signed in.

What is public: for each site, how many votes it has. Not who voted, and nothing about any list.

OpenStreetMap megaliths cannot be saved or voted for. Their records are share-alike and stay in their own layer (see `AGENTS.md`), so they are kept out of the lists and the vote table. Their cards have no account controls.

There is no free text anywhere, so there is nothing to moderate.

## The schema

`supabase/schema.sql`, run once in a new project.

| Object | What it is |
| --- | --- |
| `saved_sites (user_id, site_id, status, created_at)` | One row per visitor and site. `status` is `want` or `visited`. Primary key `(user_id, site_id)`, so a site is on one list at a time. |
| `site_votes (user_id, site_id, created_at)` | One row per visitor and site: one vote each. A visitor may vote for any number of sites. |
| `is_atlas_site_id(text)` | The CHECK on both `site_id` columns: at most 80 characters, a Wikidata Q-number or a lower-case slug, and not an `osm-` id. It is the rule of `lib/account/accountSiteId.ts`, which is the address bar's rule (`lib/globe/viewUrl.ts`) less OpenStreetMap. |
| Row level security | On both tables. A signed-in visitor reads, adds, changes and removes only rows whose `user_id` is their own. A visitor who is not signed in has no access to either table. |
| `site_vote_counts(max_sites)` | The public list: `site_id` and `votes`, most voted first, at most 200 rows. It runs with its owner's rights so that it can count everyone's votes, and it returns nothing but those two columns. Anyone may call it. |

`user_id` references `auth.users` with `on delete cascade`: deleting an account deletes its rows.

The database cannot know the catalogue, so it checks the shape of an id, not that the catalogue holds it. Someone signed in could, with their own key and a hand-written request, store an id of the right shape that is no site. The app never shows such a row: the lists and "Most voted" look every id up in the catalogue and leave out one that is not there (`components/account/useSitesById.ts`). The app's own buttons exist only on the card of a catalogue site.

## The code

```
lib/account/accountConfig.ts           the two settings, or null: no accounts
lib/account/accountSiteId.ts           which ids may be saved or voted for
lib/account/accountBackend.ts          what the store needs from a database (an interface)
lib/account/accountStore.ts            saved sites and votes: a change shows at once and is taken back if refused
lib/account/voteLeaderboard.ts         the order of "Most voted", and the two statements the screens make
lib/account/accountClient.ts           the Supabase client, fetched and made only when configured
lib/account/supabaseAccountBackend.ts  the interface on the two tables, and the vote totals
components/account/useAccount.ts       the view model: session, the store, sign-in and sign-out
components/account/SignInDialog.tsx    Google, or a link by email, and what an account stores
components/account/AccountPanel.tsx    "Your places": the two lists, sign out, delete my saved data
components/account/MostVotedPanel.tsx  the public vote list
components/account/SiteAccountControls.tsx  the three buttons on a site card
components/account/useSitesById.ts     catalogue sites for stored ids; an unknown id has none
supabase/schema.sql                    the tables, the policies and the vote function
scripts/check_account.mts              the check (tests/test_account.py)
```

`useAccount` is called once, in `components/globe/chrome/ExplorerChrome.tsx`, and returns null when accounts are not configured. The two panels are `ExplorerPanel` values (`most-voted`, `account`) and sit on `PanelShell` like the others. The sign-in is the Account panel while signed out, so it is a panel in the side column, not a window over the page.

Wording. Votes are visitors' favourites. The panel says a count is how many people find a place remarkable, not how important a site is or which reading of it is right (`WHAT_A_VOTE_MEANS`). A vote changes nothing in a site's record and is not evidence for any theory.

Hooks for browser checks: `[data-action='open-most-voted']`, `[data-action='open-account']`, `[data-role='sign-in-dialog']` with `[data-action='sign-in-google']`, `[data-action='sign-in-email']`, `[data-role='account-stores']` and `[data-role='sign-in-notice']`; `[data-role='account-panel']` with `[data-saved-list]` (`want`, `visited`), `[data-action='sign-out']` and `[data-action='delete-saved-data']`; `[data-role='most-voted-panel']` with `[data-role='vote-meaning']`; on a site card `[data-role='site-account']` with `[data-action='save-want']`, `[data-action='save-visited']` and `[data-action='vote']`, each with `aria-pressed`. A row of any list is `[data-list-item][data-site]`.

## Running without it

Do nothing. With neither setting present the feature is off, and that is how the app runs in development and in the test suite.

## Setting it up

These steps need accounts with Supabase and Google that belong to the atlas's keeper. Nobody else should create them.

1. **Create a Supabase project** at `https://supabase.com/dashboard`. The free plan is enough. Pick a region and a database password; the password is not used by the app.
2. **Create the tables.** Open the project's SQL editor, paste all of `Anatolia/atlas/supabase/schema.sql`, and run it once.
3. **Set the addresses.** Under Authentication, URL configuration: set the site URL to the address the atlas is served from, and add that same address to the redirect allow-list. For local work also add `http://127.0.0.1:43127/`. A sign-in always returns to the bare page, so one entry per address is enough.
4. **Email sign-in** is on by default. The built-in email sender is limited to a few messages an hour and is meant for trying things out; real use needs your own SMTP sender set under Authentication.
5. **Google sign-in.**
   1. In the Google Cloud console (`https://console.cloud.google.com/`), create a project.
   2. Configure the OAuth consent screen: external users, the atlas's name, a support email. Leave the scopes at email, profile and openid.
   3. Under Credentials, create an OAuth client ID of type "Web application". As an authorised redirect URI give the callback address Supabase shows on its Google provider page, of the form `https://<project-ref>.supabase.co/auth/v1/callback`. As authorised JavaScript origins give the atlas's own address.
   4. In Supabase, under Authentication, Providers, Google: switch it on and paste the client ID and the client secret. The secret goes into the Supabase dashboard only. It never goes in this repository or in the app's settings.
   5. While the consent screen is in "testing", only the test users listed there can sign in. Publish it when ready.
6. **Give the app the two settings.** From the project's API settings take the project URL and the public browser key (called the anon key, or the publishable key in newer projects). Never the `service_role` or secret key: that one bypasses row level security.

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<the public browser key>
   ```

   Locally they go in `Anatolia/atlas/.env.local`, which must not be committed. On a host they are build-time settings: Next writes `NEXT_PUBLIC_` values into the page when it builds, so a change needs a rebuild, and a dev server needs a restart. Both values are public by design; anyone can read them in the page. What protects the rows is row level security, so step 2 is not optional.
7. **Check it by hand**, since nothing else has: the list under "What is untested".

Before real visitors sign in the atlas needs a privacy notice, because Supabase will hold their email addresses. That is a decision waiting in [`todo.md`](todo.md).

## Deleting

- "Delete my saved data" in the Account panel removes every saved site and every vote of that visitor. The sign-in record (the email) stays.
- Deleting the account itself is done by the keeper today: in the Supabase dashboard, Authentication, Users, delete the user. The rows go with it. There is no button for it in the app, because the public key cannot delete a user; it would need one more database function. That is a decision waiting.

## The check

```bash
cd Anatolia/atlas
node --experimental-strip-types scripts/check_account.mts
```

It covers config detection (both settings or none, a malformed address, plain http only on this machine), the id rule and its agreement with the address bar, the store against an in-memory database (save, change of list, remove, vote, voting twice, unvote, an id that is not allowed never being sent, every change going back when the database refuses it, a failed first read, delete my saved data), the order of the vote list, the wording, and that the schema file keeps the id rule, row level security on both tables, the cascade, and no column for a place or a name.

## What is untested

Nothing here has touched a real Supabase project or a real Google client. Specifically:

- **Signing in**, by Google or by email link, and signing out. The return from a sign-in is the least certain part: it comes back as `?code=…` on the address, which `lib/account/accountClient.ts` reads as the page's code loads and exchanges for a session. If the address is rewritten before that, the sign-in is lost.
- **An email link opened in another browser or device** than the one that asked for it will not sign in: the exchange needs a value kept in the first browser. The sign-in says "Open it in this browser".
- **The schema.** `schema.sql` has not been run. The policies, the grants and `site_vote_counts` have not been tried against a database, so "a visitor reads only their own rows" is the intent of the file, not a tested fact. Try it with two accounts, and call the tables with no session.
- **The Supabase calls** in `supabaseAccountBackend.ts` (upsert, delete, the function call). The store was checked against a fake that stands in for them.
- **The signed-in screens.** "Your places" with rows in it, a pressed button on a site card and a "Most voted" list with sites in it have never been drawn in a browser, because nobody has signed in. What was looked at, in headless Chrome with software WebGL: the not-configured state on the dev server (no account controls, no Supabase request, no console error), and the signed-out state in a throwaway production build whose two settings pointed at an address that does not exist (the six top bar buttons at 1,280 px and 700 px, the three buttons on a site card, the sign-in opening from them with the focus inside it and closing on Escape, no request until a button is pressed, and the messages shown when the email link and the vote totals cannot be reached).
- **More than 1,000 saved sites** for one visitor: one request reads them and a project returns at most 1,000 rows by default.
- **Two quick presses on one site while a request is in flight**, when the first one fails: the store restores what the failed change saw, which may be stale.

## Not built

Trip planning (an ordered route through saved sites) was raised and left for later. Also absent: vote totals on a site card, a limit on how many sites a visitor may vote for, the visitor's own list of votes (a site's card shows whether they voted for it), and accounts outside the globe view.
