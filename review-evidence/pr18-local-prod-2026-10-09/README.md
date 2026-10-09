# Local production-mode authentication validation — 9 October 2026

This directory records real Chromium browser checks against the full local frontend and backend assemblies, PostgreSQL, and an HTTPS nginx proxy. **All five requested scenarios passed locally**, with the expiry acceleration described below. No deployed environment or real user data was used. The PR source trees were not modified during validation.

## Revisions and environment

- Backend core PR #18: `a650a9f6ec46f0f831f2774d6e0368b641b54ed0`.
- Frontend core PR #18: `3c0f77897f1ca832ccc8cc4f39575afb72464b29`.
- Backend assembler: local checkout at `a75741e127d729806642bfb41574625f0e0293ed`, with its existing modified `openimis.json`.
- Frontend assembler: local checkout at `f3bfe26d7afbb6a111f8872fe5f11304c7513e71`, with its existing modified `package.json` and `openimis.json`, and installed modules.
- nginx 1.24.0; PostgreSQL 16.15; Django 4.2.30; Chromium 156.0.8078.4.
- URL: `https://localhost:8443/front/`. nginx binds only `127.0.0.1:8443`; backend binds `127.0.0.1:18000`; isolated PostgreSQL binds `127.0.0.1:55432`.
- `MODE=prod`, `DEBUG=False`, `IS_TESTING=False`, Django CSRF middleware enabled, no user-agent CSRF bypass, `CSRF_USE_SESSIONS=True`.
- Secure, HttpOnly, SameSite=Lax JWT and session cookies; session age 28,800 seconds. Default JWT lifespan observed at login: approximately 86,400 seconds. No separate refresh-token cookie.
- nginx preserves the repository's `Host $host`, `X-Forwarded-Host $server_name`, and `X-Forwarded-Proto https` rules. Django uses the forwarded host and trusts the explicit local HTTPS origin including port 8443.
- Production frontend build, with only a local webpack alias pointing all core imports to the PR build. Backend core selected using `PYTHONPATH`.
- Runtime uses the assembler's Django/Channels `runserver --noreload` under production settings, not a deployed Gunicorn/Daphne process configuration.
- A new database cluster was populated from the repository's `EmptyDatabase.sql`, followed by all Django migrations and a synthetic administrator fixture. A bootstrap `view_user` permission was inserted to satisfy existing core startup behavior. Email uses an in-memory backend and scheduler autostart is disabled.

## Browser checks

| Case | Result | Evidence |
| --- | --- | --- |
| JWT login with secure cookies | PASS | JWT mode, 24-hour default JWT, eight-hour session, no refresh cookie |
| Logout through nginx | PASS | Actual frontend click sends HTTPS Origin; logout returns 204; JWT/session cookies cleared; reload and current-user are anonymous (401) |
| CSRF enforcement | PASS | Untrusted Origin with a token returns 403; trusted Origin without a token returns 403; authentication remains intact |
| Admin session → frontend → logout → reload | PASS | Real Django admin form login; no JWT; frontend reports session mode; frontend logout returns 204; reload is anonymous |
| Expired CSRF session | PASS | Expired one `django_session.expire_date` in PostgreSQL while retaining a valid JWT; actual user-search request returns the quoted `'csrftoken'` error and one Session Expired dialog |
| Cancel and backdrop dismissal | PASS | Both dismiss the dialog; another Apply Filters request shows a new dialog; search input remains intact |
| Confirm expired-session logout | PASS | OK triggers 403 → CSRF bootstrap → 204 recovery; reload is anonymous |
| Backend restart with unsaved form | PASS | Stopped the real backend while a New User form held an unsaved last name; the unchanged two-minute current-user request received nginx 502; no expiry dialog or fatal page appeared; the draft remained intact during the outage and after restarting the backend (current-user 200) |

The eight-hour case uses real server-side session expiration by moving the test session's expiry timestamp into the past. It does not claim an eight-hour wall-clock soak test. Session configuration itself remains 28,800 seconds.

## JWT renewal check

PASS: with a local-only 180-second JWT lifetime, the **unchanged 120-second frontend interval** checked current-user and renewed the JWT with HTTP 200. The new token's expiration advanced by 120 seconds. After the original token expired, the refreshed browser still received current-user 200; a separate context carrying the original expired JWT received 401. There was no separate refresh-token cookie.

The test retained `MODE=prod` and the complete security configuration. Only `JWT_EXPIRATION_DELTA` was shortened in the temporary assembler through `LOCAL_AUTH_JWT_SECONDS`; see `local-jwt-override.py`. This is a real-time browser/network test across an actual expiration boundary, not a twenty-four-hour soak test. The default 86,400-second lifetime was separately verified in the baseline and restored after testing.

`sliding-results.raw.json` and `browser-sliding.log` retain the raw output. Its `renewalDelaySeconds=-1` telemetry included the anonymous boot refresh; it is not the post-login renewal delay. `sliding-results.json` omits that misleading field and explains the correction. The actual post-login assertions independently waited for the next refresh, required at least 110 elapsed seconds, checked the new JWT expiry, crossed the original expiry, and checked both tokens against the live backend. All passed.

## Evidence and rerunning

`baseline-results.json`, `restart-results.json`, and `sliding-results.json` record assertions. PNGs show the actual browser. `settings-evidence.log` records active security settings and the loaded core path. The `.cjs`, `.py`, shell and configuration files are snapshots of the executed local harness, with absolute paths for this workstation.

The runtime and browser dependencies live in `/tmp/mlatho-local-prod`; the random local account credentials and signing key remain there in mode-0600 files and are deliberately not copied into this evidence directory. The scripts require those runtime files, the existing installed application dependencies, and the temporary cluster; they are not a standalone installation package.

During setup, an initial empty-database migration attempt failed because the legacy baseline schema was absent; loading the baseline resolved it. A subsequent startup needed the bootstrap permission described above. Browser harness iteration corrected header inspection and button selectors and moved the expiry trigger from a health-facility picker to a protected core user-search query. The first attempt to layer a separate settings module for shortened JWTs did not start; the eventual test uses a guarded lifetime override in the temporary assembler’s normal settings loader. These were setup/harness adjustments; application code was unchanged.

Local certificate verification is ignored only by the automated browser for the self-signed localhost certificate. HTTP Origin and CSRF checks remain enabled. This validates the local proxy configuration and PR combination; it does not certify a remote deployment's hostnames, trusted origins, certificates, worker topology or cookies. Those settings must be checked when deploying.

## Published evidence index

- [Baseline browser assertions](baseline-results.json) and [execution log](browser-validation.log).
- [Backend restart assertions](restart-results.json) and [execution log](browser-restart.log).
- [JWT renewal assertions and telemetry correction](sliding-results.json), [raw output](sliding-results.raw.json), and [execution log](browser-sliding.log).
- [Active production security settings](settings-evidence.log), [restored normal lifetimes](restored-settings.log), [nginx configuration](nginx.conf), and [build hashes](build-hashes.json).
- Browser screenshots: [logged out](logout-anonymous.png), [admin session in frontend](admin-session-front.png), [expired-session dialog](session-expired.png), [unsaved form during 502](restart-502-unsaved-form.png), [same form after recovery](restart-recovered-unsaved-form.png), [authenticated beyond original JWT expiry](jwt-past-original-expiry.png).
- Executed browser scripts: [baseline](validate.cjs), [restart](restart.cjs), [JWT sliding](sliding.cjs), and [shared helpers](common.cjs). Supporting configuration and fixture scripts are in this directory.

This evidence is published on a separate branch so that no backport documentation or standalone runner is added to PR #18's application changes. Credentials, signing keys, certificates/private keys, databases, and raw authenticated HTTP headers are not included.
