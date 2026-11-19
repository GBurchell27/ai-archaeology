# Accounts

The atlas is open: a visitor lands on the globe and uses all of it without signing in. Signing in is optional. It gives a visitor two lists (sites they want to visit, sites they have visited) and a vote for the places they find most remarkable. The votes add up to a public "Most voted" list. It is free, and there is nothing to pay for.

Accounts run on [Neon](https://neon.com): Neon Auth holds the sign-ins, and a Neon Postgres database holds the saved sites and the votes. On 2026-11-19 the feature was run against a real Neon project from a production build on this machine, with one throwaway account that was deleted afterwards. It has not run on Vercel, and two sign-in paths were not completed. See "What was tested and what was not".

Paths are relative to `Anatolia/atlas` unless they start with `docs/` or `tests/`.

## The three states

| State | What the visitor sees |
| --- | --- |
| **Not configured** (any of the three settings below is absent when the app is built) | The atlas exactly as it was. No account button, no controls on a site card, no "Most voted". The sign-in code is not downloaded and no request is made. The account routes answer 503. |
| **Configured, signed out** | "Most voted" and "Sign in" in the globe's top bar. A site card has "Want to visit", "Visited" and "Vote"; pressing one opens the sign-in. The "Most voted" list is readable. |
| **Signed in** | "Sign in" becomes "Account": the two lists, whose rows open the site on the globe, with "Sign out" and "Delete my saved data". The buttons on a site card save, move, remove and vote. |

Accounts exist only on the globe. The Anatolia map, the place view and the walk have no account controls.

## Signing in

Two ways, both in the Account panel:

- **Google.** The visitor leaves for Google and comes back signed in.
- **A code by email.** The visitor gives an address, Neon Auth sends a code to it, and the visitor types the code into the same panel. There is no password and no link to click, so it works in whichever browser asked. A code was chosen over a link because Neon's shared mail sender delivers codes, while links need your own sender.

## What is stored

- In the two tables of this project (`public.saved_sites`, `public.site_votes`): the id Neon Auth gives the account, a site id, for a saved site which of the two lists it is on, and the time the row was made. Nothing else. No coordinates, no names, no free text. A site id is a published catalogue id, the same one an address carries (`?site=Q214944`).
- By Neon Auth, in the `neon_auth` schema of the same database: the email address the visitor signs in with, the sessions (each with the IP address and browser name it was made from), and, with Google, the name and picture of the Google profile, which Google sends with the sign-in. The atlas reads only the account id and the email, to show the visitor which account they are in. It shows none of this to anyone else.
- In the visitor's browser: two session cookies set by the atlas's own address, so they stay signed in.

What is public: for each site, how many votes it has. Not who voted, and nothing about any list.

OpenStreetMap megaliths cannot be saved or voted for. Their records are share-alike and stay in their own layer (see `AGENTS.md`), so they are kept out of the lists and the vote table. Their cards have no account controls.

There is no free text anywhere, so there is nothing to moderate.

## How a request travels

The browser never talks to the database, and holds no key.

1. The page calls the atlas's own routes: `/api/auth/*` for signing in and out, `/api/account/*` for the lists and votes.
2. `/api/auth/*` (`app/api/auth/[...path]/route.ts`) passes each request on to Neon Auth and sets the session cookies.
3. `/api/account/*` (`app/api/account/[[...path]]/route.ts`) reads the session from the cookies, answers 401 without one, and otherwise runs SQL over a pooled Postgres connection. The visitor's id comes from the session and is the first parameter of every statement (`lib/account/accountQueries.ts`). There is no row level security: the server is the guard.

| Route | Needs a session | What it does |
| --- | --- | --- |
| `GET /api/account/leaderboard` | No | `site_id` and vote count for the 50 most voted sites. Nothing else. |
| `GET /api/account/saved`, `GET /api/account/votes` | Yes | The visitor's own rows, at most 1,000 each. |
| `PUT /api/account/saved/<site id>?status=want\|visited` | Yes | Adds the site to a list or moves it. |
| `DELETE /api/account/saved/<site id>` | Yes | Takes it off. |
| `PUT /api/account/votes/<site id>`, `DELETE …` | Yes | Votes, takes the vote back. |
| `DELETE /api/account/data` | Yes | Every saved site and vote of the visitor. |

The server checks every site id with the rule of `lib/account/accountSiteId.ts` (400 otherwise), refuses a 1,001st row in either table for one visitor (409), refuses a request whose `Origin` is another site (403), and takes no request body. Without the settings every route, `/api/auth/*` included, answers 503 with `accounts-unavailable`.

## The schema

`db/schema.sql`, run once on the database after Neon Auth is enabled.

| Object | What it is |
| --- | --- |
| `saved_sites (user_id, site_id, status, created_at)` | One row per visitor and site. `status` is `want` or `visited`. Primary key `(user_id, site_id)`, so a site is on one list at a time. |
| `site_votes (user_id, site_id, created_at)` | One row per visitor and site: one vote each. A visitor may vote for any number of sites, up to the 1,000-row limit. |
| `is_atlas_site_id(text)` | The CHECK on both `site_id` columns: at most 80 characters, a Wikidata Q-number or a lower-case slug, and not an `osm-` id. It is the rule of `lib/account/accountSiteId.ts`, which is the address bar's rule (`lib/globe/viewUrl.ts`) less OpenStreetMap. |

`user_id` is a `uuid` that references `neon_auth."user" (id)` with `on delete cascade`: deleting an account deletes its rows. That table and its `uuid` id were read from the live database, and the cascade was seen to work.

The database cannot know the catalogue, so it checks the shape of an id, not that the catalogue holds it. Someone signed in could, with a hand-written request, store an id of the right shape that is no site. The app never shows such a row: the lists and "Most voted" look every id up in the catalogue and leave out one that is not there (`components/account/useSitesById.ts`).

## The code

```
lib/account/accountConfig.ts           the three server settings, or null: no accounts; and the one value the page is told
lib/account/accountSiteId.ts           which ids may be saved or voted for
lib/account/accountBackend.ts          what the store needs from a database (an interface)
lib/account/accountStore.ts            saved sites and votes: a change shows at once and is taken back if refused
lib/account/voteLeaderboard.ts         the order of "Most voted", and the two statements the screens make
lib/account/accountClient.ts           browser: the Neon Auth client, fetched and made only when accounts are on
lib/account/fetchAccountBackend.ts     browser: the interface as requests to /api/account
lib/account/accountRoutes.ts           server: what each /api/account route answers (no Next, no database)
lib/account/accountQueries.ts          server: the interface as SQL, each statement tied to one visitor
lib/account/accountServer.ts           server: the Neon Auth instance and the Postgres pool
app/api/auth/[...path]/route.ts        Neon Auth's routes, passed on to the auth service
app/api/account/[[...path]]/route.ts   the account routes: settings, session, then accountRoutes.ts
components/account/useAccount.ts       the view model: session, the store, sign-in and sign-out
components/account/SignInDialog.tsx    the sign-in: Google, the email code, and what an account stores
components/account/EmailCodeSignIn.tsx the email address, then the code
components/account/AccountPanel.tsx    "Your places": the two lists, sign out, delete my saved data
components/account/MostVotedPanel.tsx  the public vote list
components/account/SiteAccountControls.tsx  the three buttons on a site card
components/account/useSitesById.ts     catalogue sites for stored ids; an unknown id has none
db/schema.sql                          the two tables
neon.ts                                which Neon services the project declares (`neon deploy` reads it)
scripts/check_account.mts              the check (tests/test_account.py)
```

`useAccount` is called once, in `components/globe/chrome/ExplorerChrome.tsx`, and returns null when accounts are off. The two panels are `ExplorerPanel` values (`most-voted`, `account`) and sit on `PanelShell` like the others. The sign-in is the Account panel while signed out, so it is a panel in the side column, not a window over the page.

**How the page knows accounts are on.** The settings are server-only, so the page cannot read them. `next.config.ts` checks them when the app is built and writes one value into the page, `NEXT_PUBLIC_ATLAS_ACCOUNTS`: `on` or empty. Nobody sets that variable by hand. A change of settings therefore needs a rebuild (on Vercel, a redeploy), and a dev server restarts itself when `.env.local` changes.

**`@neon/auth` and Next 15.** `@neon/auth` 0.8.2 declares Next 16 or later as an optional peer, and `npm install` refuses it beside Next 15 for that reason alone. `package.json` has an `overrides` entry that points that peer at the installed Next. The parts used here (`createNeonAuth`, its route handler, `getSession`, the browser client) call only `cookies()`, `headers()` and `NextResponse`, which Next 15 has, and they were seen to work on Next 15.5 in a production build. When the atlas moves to Next 16, remove the override.

**`neon.ts`** also declares a sample function (`hello.ts`) and a storage bucket (`assets`), as `neon init` wrote them. The app uses neither. Whether to remove them is in [`todo.md`](todo.md).

Wording. Votes are visitors' favourites. The panel says a count is how many people find a place remarkable, not how important a site is or which reading of it is right (`WHAT_A_VOTE_MEANS`). A vote changes nothing in a site's record and is not evidence for any theory.

Hooks for browser checks: `[data-action='open-most-voted']`, `[data-action='open-account']`, `[data-role='sign-in-dialog']` with `[data-action='sign-in-google']`, `[data-action='sign-in-email']`, `[data-action='sign-in-code']` (present once a code was sent), `[data-role='account-stores']` and `[data-role='sign-in-notice']`; `[data-role='account-panel']` with `[data-saved-list]` (`want`, `visited`), `[data-action='sign-out']` and `[data-action='delete-saved-data']`; `[data-role='most-voted-panel']` with `[data-role='vote-meaning']`; on a site card `[data-role='site-account']` with `[data-action='save-want']`, `[data-action='save-visited']` and `[data-action='vote']`, each with `aria-pressed`. A row of any list is `[data-list-item][data-site]`.

## The settings

| Variable | Secret | Where it comes from |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** (it holds the database password) | Neon: the pooled connection string, the one whose host has `-pooler`. |
| `NEON_AUTH_BASE_URL` | No, but keep it with the others | Neon: the branch's Auth address. |
| `NEON_AUTH_COOKIE_SECRET` | **Yes** | Made by you, 32 characters or more: `openssl rand -base64 32`. Neon does not supply it. Changing it signs everyone out. |

All three or none: with any one missing, accounts are off. `DATABASE_URL_UNPOOLED` (the direct connection) is used only by hand, to run the schema. `neon env pull` also writes `NEON_AUTH_JWKS_URL`, the `NEON_BRANCH*` values and `AWS_*` keys for the storage bucket; the app reads none of them.

No setting belongs in git. `.env*` is ignored, and so is `.neon`, the file in which the Neon command line keeps the organisation and project ids.

## Running without it

Have no `.env.local`, or leave any of the three settings out. The feature is then off. To build or run once without it while `.env.local` exists, blank one for that command: `DATABASE_URL= npm run build`.

The test suite's browser checks run against the dev server as it is, so with a complete `.env.local` they run with accounts on.

## Setting it up

These steps need a Neon account that belongs to the atlas's keeper.

1. **Create the services.** In `Anatolia/atlas`, with the Neon command line signed in: `neon deploy`. It reads `neon.ts`, enables Neon Auth on the project's branch, and writes the branch's settings into `.env.local` (`neon env pull` does only the writing).
2. **Add the cookie secret** to `.env.local` as `NEON_AUTH_COOKIE_SECRET`.
3. **Create the tables**, over the direct connection: `psql "$DATABASE_URL_UNPOOLED" -f db/schema.sql`, or paste the file into the SQL editor of the Neon console. Once only; the file does not drop anything.
4. **Local address.** Neon Auth accepts requests only from origins it trusts. `http://localhost:<port>` is trusted while "Allow localhost" is on, which is the default. `http://127.0.0.1:<port>` is **not**: a sign-in from it is refused with `INVALID_ORIGIN`. Open the dev server as `http://localhost:43127`, or trust the other form: `neon neon-auth domain add http://127.0.0.1:43127`.
5. **Sign-in methods.** Google works at once with Neon's shared Google credentials, which are for development: the consent screen shows Neon's name. The email code was sent without further setup on this project's branch; if it is refused, switch on "Sign-up and sign-in with email" and "Email OTP" for the branch in the Neon console under Settings, Auth.

### On Vercel

1. In the Vercel project, under Environment Variables, set `DATABASE_URL`, `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` (mark the first and last as sensitive), then redeploy: the page learns at build time whether accounts are on.
2. Trust the deployed origin, with the scheme and no trailing slash: `neon neon-auth domain add https://<your domain>`. Do the same for any preview address you want sign-in to work on.

### Before real visitors sign in

Neon's production checklist (`https://neon.com/docs/auth/production-checklist`), which was read but not carried out:

- **Your own Google credentials.** In the Google Cloud console create an OAuth client of type "Web application" with the redirect URI `<NEON_AUTH_BASE_URL>/callback/google`, then `neon neon-auth oauth-provider add --provider-id google --oauth-client-id <id> --oauth-client-secret <secret>`. The secret goes to Neon only, never into this repository.
- **Your own mail sender.** The shared one is for development. Set a custom SMTP provider in the Neon console (Settings, Auth) or with `neon neon-auth config email-provider update`.
- **The application name** shown in the emails, in the same place.
- **Switch off "Allow localhost"** on the production branch.
- **A privacy notice**, because Neon will hold visitors' email addresses. That is a decision waiting in [`todo.md`](todo.md).

## Deleting

- "Delete my saved data" in the Account panel removes every saved site and every vote of that visitor. The sign-in record (the email) stays.
- Deleting the account itself is done by the keeper: `neon neon-auth user delete <user id> --project-id <project id>`, with the id from `select id, email from neon_auth."user"`. The rows go with it. There is no button for it in the app: Neon Auth's `delete-user` route answered 404 on this project, so a signed-in visitor cannot delete their own account through it. A button would need a server route that deletes the `neon_auth."user"` row itself. That is a decision waiting.

## The check

```bash
cd Anatolia/atlas
node --experimental-strip-types scripts/check_account.mts
```

It covers the settings (all three or none, a cookie secret that is too short), the id rule and its agreement with the address bar, the store against an in-memory database (save, change of list, remove, vote, voting twice, unvote, an id that is not allowed never being sent, every change going back when the database refuses it, a failed first read, delete my saved data), the browser's requests against a stub `fetch` (one request per call, a 500 and a 401 each taking the change back, a 401 reported as signed out), the server's routes against a query runner that records (401 on every own route without a session and no statement run, the vote totals without one, every statement naming the session's visitor as its first parameter and carrying no value in its text, ids and statuses refused with 400, unknown routes, the 1,000-row limit, a request from another site), the order of the vote list, the wording, and that the schema file keeps the id rule, the cascade, and no column for a place or a name. No real service is touched.

## What was tested and what was not

Tested on 2026-11-19 against the real Neon project, from a production build (`next build`, Next 15.5) served on this machine as `http://localhost:<port>`, with one throwaway account at a non-deliverable address, deleted afterwards with the Neon command line:

- The schema: applied over the direct connection; both foreign keys cascade.
- Without a session: every own route answers 401, the vote totals answer 200, `get-session` answers null.
- Sign-up and sign-in **with email and password, through `/api/auth` directly**. The app has no password form; this was only a way to get a session without a mailbox. A wrong password is refused.
- With the session: save, move to the other list, vote twice (one vote), read both back, the public vote totals, remove, delete my saved data, each confirmed by counting rows in the database. Bad ids and a bad status answer 400, another site's `Origin` 403.
- Sign-out, and 401 on every own route afterwards. The session after a reload.
- In headless Chrome: the sign-in opening from a site card's button, "Send the code" answered by the service, the code field appearing, a wrong code refused with its message; then, signed in, the buttons on a site card pressed and kept after a reload, "Your places" with a row, "Most voted" with a row and its count, "Delete my saved data", "Sign out".
- Deleting the account from the command line removed its saved sites and votes.
- Not configured: every route 503, no account control on the page, no account request, no console error.

Not tested:

- **Google sign-in**, start to finish. It needs a person at a real browser. The return is the least certain part: Google sends the visitor back with a `neon_auth_session_verifier` on the address, which the client must still find there when it first asks for the session; `lib/account/accountClient.ts` puts it back if the globe's own rewrite of the address dropped it. That code has never run.
- **Signing in with a correct emailed code.** The code went to an address that receives nothing, and the service does not keep it readable. Sending, and a wrong code, were seen.
- **A first sign-in by email code for an address with no account.** Whether the service then makes the account was not tried.
- **Vercel.** The routes ran under `next start`, not as Vercel functions; `attachDatabasePool` does nothing off Vercel.
- **Two visitors at once.** One account was used. That one visitor cannot reach another's rows rests on the check script (every statement carries the session's id), not on a test with two accounts.
- **More than 1,000 rows**, and the limit itself against the real database.
- **Two quick presses on one site while a request is in flight**, when the first one fails: the store restores what the failed change saw, which may be stale.
- **Mail delivery** from the shared sender to a real mailbox.

## Not built

Trip planning (an ordered route through saved sites) was raised and left for later. Also absent: "Delete my account" in the app, vote totals on a site card, a limit on how many sites a visitor may vote for beyond the row limit, the visitor's own list of votes (a site's card shows whether they voted for it), and accounts outside the globe view.
