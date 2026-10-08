# Mlatho authentication backport: openIMIS frontend #343

Upstream: https://github.com/openimis/openimis-fe-core_js/pull/343
Backend prerequisite: https://github.com/openimis/openimis-be-core_py/pull/447

## Baseline and mapping

Fork: `nlgfc2024/openimis-fe-core_js`; target `mw/develop`, base `8b56621`.
Original clean checkout remains at `1d1c4a9`; a separate worktree includes the newer merged remote changes.
Previous fork PRs #3/#4 already addressed login/reload symptoms, but initialization still unconditionally
refreshed JWTs before loading the current user. There was no `hasStoredAuthSession` helper to remove.
HTTP 401 was swallowed by middleware, and CSRF handling was duplicated in `fetch` and `graphql`.
The full upstream diff, commits and review discussions were reviewed; no blind frontend cherry-pick was attempted.

| Upstream area | Fork adaptation |
| --- | --- |
| `src/actions.jsx` | `src/actions.js`: protected-route silent server probe, one refresh on auth failure, retry, controlled logout, session CSRF retrieval |
| `src/helpers/api.jsx` | `src/helpers/api.js`: precise 401/CSRF classification, real middleware payload status, guarded live-cookie selection with session fallback |
| `src/reducer.js` | Preserve user for 403; defer silent-probe cleanup; clear resolved auth errors; deduplicate expiry confirmation |
| Middleware interaction | `src/middlewares.js`: preserve exported middleware but pass through request-specific errors intact; `fetch` owns session UI |
| Initialization/public routes | `src/components/App.js`: match built-in and contributed public routes using the actual basename; pass public-route flag |
| Periodic refresh | `src/helpers/hooks.js`: server-first no-argument login avoids requiring a refresh cookie for Django sessions |

No-argument `login()` is retained for compatibility with consumers. Existing credential login, password expiry,
warning fields, Sentry integration, permissions, custom UI/configuration and request metadata remain.
Sentry request bodies/raw responses were removed from error reports to avoid recording credentials/tokens.
This fork has **no impersonation code**; no upstream impersonation feature is imported.
Neither upstream frontend #354 nor backend #446 is included.

## CSRF adaptation

Prefer the live exact `csrftoken` cookie over a stale persisted value; support cookies separated without spaces and non-browser execution.
When no cookie exists (`CSRF_USE_SESSIONS` or HttpOnly), use the existing stored token fallback.
Successful initialization explicitly calls the existing `getCsrfToken` mutation, including Django-only sessions.

Unlike upstream, the fork's `_check_csrf_token` literally compares the header to a masked token stored in
`request.session['csrftoken']`. Therefore a freshly server-issued session token is used while bound to the
same observed cookie. Cookie rotation invalidates that in-memory association; stale storage cannot override the new cookie.
No new persistent token store is introduced. The periodic probe reuses an established CSRF token to avoid
rewriting the session's masked token every two minutes. Validate both cookie and session-based modes against the actual assembly.

## Session handling

HTTP 401 and the exact recognized `CSRF token missing or incorrect.` message require reauthentication.
403, `unauthorized`, ordinary permission failures and GraphQL schema errors do not.
Silent probes retain refresh cookies and request-specific failure actions. They do not show expiry UI or race middleware cleanup.
Protected runtime failures retain their response and use the existing `csrf_logout` confirmation once per expiry episode.
The existing App confirmation handler performs logout; this does not import #354's alternative UX.
Boot and no-argument login permit one refresh attempt; HTTP-200 GraphQL refresh errors are failures, not successes.
Cleanup clears local authentication even when the cookie-deletion request fails. It does not clear unrelated application storage on boot.

## Executed checks

- `npm run test:auth`: **21 passed**, Node 24.16.0. Uses Node's built-in test runner, existing Babel, Redux and installed `redux-api-middleware` 3.2.1; no new dependencies/lockfiles.
- `npm run build`: **passed**, Rollup generated ES/CJS bundles. Existing warnings: external/unresolved `@sentry/react`, `zxcvbn`, `nepali-date-converter`; existing i18n/date formatter circular import.
- `git diff --check`: **passed**.
- Standalone ESLint: **unavailable** in this module's installed dependencies; no lint script. Babel/Rollup parsed the complete module.
- Live browser/e2e and full assembled frontend build: **not run**. HTTP, browser globals, UI imports and Sentry are mocked in focused tests; actual cookies/middleware/database require integration testing.

## Manual integration matrix (not yet executed)

| Scenario | Required result |
| --- | --- |
| Anonymous `/front`, with and without stale CSRF storage | Login page after one failed refresh; no fatal/expiry dialog |
| Valid Django session, storage empty and no JWT refresh cookie | User loads; protected mutation succeeds; remains authenticated beyond periodic refresh |
| Valid JWT | User loads without mandatory refresh |
| Expired access JWT, valid refresh cookie | Exactly one silent refresh and successful user retry |
| Both JWTs expired, or retry still 401 | One controlled logout, no refresh loop |
| Permission-denied GraphQL response / REST 403 / current_user 403 | User remains authenticated; module error handling remains available |
| Protected GraphQL HTTP 401; several requests concurrently | One existing expiry confirmation; acknowledgement clears auth once; payloads preserved |
| CSRF cookie rotated by login, then mutation | Newly issued session token is used; stale saved value does not override rotated cookie |
| `CSRF_USE_SESSIONS=True` / HttpOnly CSRF | Token fetched from server; mutations work without readable CSRF cookie |
| Password expired and password-expiry warning | Existing reset-email and warning workflows remain intact |
| Built-in/contributed public route, custom basename | No authentication probe required; public page renders |
| Current-user network failure / CSRF retrieval failure | Initialization completes and an actionable error is available; no expiry-dialog storm |
| Impersonation | Not applicable: absent from this fork; assess separately if assembler injects this capability |

## Release constraints

Validate backend 401 mapping and real REST current-user authentication first, then activate the frontend.
The current assembler places JWT authentication before session authentication and maps DRF authentication failures to 401.
Do not broaden 403 handling to compensate for an incompatible assembler.
The existing logout mutation deletes JWT cookies; it does **not** terminate a Django admin session.
A browser with a valid Django session may authenticate again on reload. Agree the desired cross-application logout policy before release;
this backport does not change backend session lifetime or authentication middleware precedence.
Cross-module mixed auth/permission gates and the legacy CSRF checker are separate backend concerns.
Both implementation PRs remain drafts pending live integration validation.
