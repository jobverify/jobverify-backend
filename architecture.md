# Jobverify Backend Architecture

## Overview

Jobverify Backend is an Express 5 and MongoDB application with a separate scraper runtime. It handles:

- email-first account registration and verification
- cookie-backed authenticated sessions with CSRF protection
- protected job search and job detail APIs
- user profile and onboarding state
- admin analytics, moderation, and scraper controls
- scraper execution, persistence, and status history

At a high level, the backend is split into two runtimes:

```text
Frontend SPA
  -> Express server (server.js)
  -> security middleware
  -> route modules in src/routes
  -> controllers in src/controllers
  -> Mongoose models in src/models
  -> MongoDB

Scraper runner
  -> source scrapers
  -> India and recency filters
  -> location normalization and fingerprinting
  -> Job / ScraperStatus / ScraperRun writes
  -> MongoDB
```

## Runtime Entry Points

### HTTP composition and process lifecycle

`src/app.js` exports `createApp()`. It composes security headers, CORS,
32 KB body parsing, JSON-only mutations, CSRF, rate-limit profiles, route groups,
JSON API 404s, and error handling. Constructing it does not open a socket or
connect MongoDB. Configuration is loaded by the entry point before importing
the app; tests provide temporary process configuration before import.

`src/config/http.js` parses ports and proxy policy without confusing CIDR
addresses with numeric hop counts. Only configure proxy hops/networks that the
deployment actually controls.

`server.js` connects MongoDB, starts HTTP, and owns termination signals.
`src/runtime/lifecycle.js` serializes each recurring maintenance task and drains
HTTP requests and maintenance before disconnecting MongoDB. Shutdown fails
after ten seconds if work cannot finish, allowing the process supervisor to
observe unsuccessful termination.

- `GET /health`: process liveness, independent of database availability.
- `GET /ready`: returns 200 only while MongoDB is connected and shutdown has not
  begun; otherwise returns 503. Responses are not cached.
- `/api/auth`, `/api/user`, `/api/billing`, `/api/scrape`, and
  `/api/admin` use `Cache-Control: no-store`.

### `scraper-support/runner.js`

`scraper-support/runner.js` is the job collection entry point. It:

- loads the root `.env`
- builds the scraper list from the provider registry and disk-backed catalog
- supports:
  - normal live mode
  - `--dry-run`
  - `--parallel`
- seeds `ScraperStatus` documents in live mode
- seeds scraper status, then refreshes each source in place without clearing the full jobs collection first
- writes per-source status into `ScraperStatus`
- writes per-run history into `ScraperRun`

Parallel mode uses `SCRAPER_CONCURRENCY`. Fatal persistence failures and escaped lifecycle errors cancel the worker pool and stop dequeueing work; cancellation is bounded and recorded. Ordinary source failures follow the configured failure threshold, which is disabled by default.

## Security and Request Pipeline

Every API request passes through a shared security stack:

1. CORS checks validate the request origin against `CORS_ORIGIN`, with loopback exceptions outside production.
2. `helmet` applies baseline hardening headers.
3. `requireJsonMutation` rejects mutating `/api` requests that are not JSON.
4. `createCsrfProtection()` rejects mutating `/api` requests unless:
   - the request origin is allowed
   - the `jobverify_csrf` cookie exists
   - the `x-csrf-token` header matches the cookie value
5. A global `/api` rate limiter caps request volume per IP.
6. Route-level middleware performs auth, validation, and role checks.

### Session Model

Authentication accepts either:

- the httpOnly `jobverify_token` cookie
- an `Authorization: Bearer ...` header

The frontend primarily relies on the cookie. The backend still accepts Bearer tokens for compatibility.

### CSRF Bootstrap

The frontend initializes mutating requests through:

- `GET /api/auth/csrf-token`

That route issues the non-httpOnly `jobverify_csrf` cookie and returns the same token in JSON. The client mirrors it into the `x-csrf-token` header for `POST`, `PUT`, `PATCH`, and `DELETE`.

## Authentication

Primary files:

- `src/routes/authRoutes.js`
- `src/controllers/authController.js`
- `src/middleware/authMiddleware.js`
- `src/middleware/validateRequest.js`
- `src/utils/authCookies.js`
- `src/utils/csrf.js`
- `src/utils/sendEmail.js`

Flow:

1. `GET /api/auth/csrf-token`
   - issues or reuses the CSRF cookie
   - returns `{ token }` for the SPA client

2. `POST /api/auth/register`
   - validates `name` and `email`
   - does not collect a password yet
   - normalizes the email
   - creates a `PendingUser` record with a hashed verification token
   - sends a Brevo email containing a frontend verification link
   - always returns a generic success message to avoid account enumeration

3. `GET /api/auth/verify-email`
   - accepts `?token=...`
   - redirects into the frontend verification flow at `/verify-email#token=...`

4. `POST /api/auth/verify-email`
   - validates the token and password strength
   - looks up `PendingUser` by verification token hash
   - creates the real `User`
   - deletes the pending record
   - returns a frontend redirect target such as `/verify-email?verified=1`

5. `POST /api/auth/resend-verification`
   - rate limited
   - enforces resend cooldown and resend-count rules inside `PendingUser`
   - returns a generic success message whether or not a matching pending user exists

6. `POST /api/auth/login`
   - validates credentials
   - applies a separate login backoff keyed by normalized email plus IP
   - rejects deactivated users
   - sets the httpOnly `jobverify_token` cookie
   - returns a non-sensitive user snapshot in JSON

7. `POST /api/auth/logout`
   - requires auth
   - stores the current token in `BlacklistedToken`
   - clears the auth cookie

## Jobs

Primary files:

- `src/routes/jobRoutes.js`
- `src/controllers/jobController.js`
- `src/models/Job.js`
- `src/models/Click.js`
- `src/utils/publicJobLocationScope.js`
- `src/utils/jobLocations.js`

Important behavior:

- Public read paths are open, with optional auth used only to unlock premium filters and personalized recommended sorting.
- Public job visibility is enforced through the materialized `isPublicIndia` flag applied by `applyPublicJobLocationScope()`.
- Unscoped metadata and landing-page stats are served from the persisted `JobDatasetSummary` document when available.

Endpoints:

- `GET /api/jobs`
  - compatibility route for offset pagination and premium `recommended` sorting
  - supports `page`, `limit`, `sort`, `query`, `company`, `city`, `location`, `jobType`, `batch`, `branch`, `skills`, and enrichment filters
  - always filters to `status: "active"`
  - applies public location scope through `isPublicIndia`
  - supports:
    - `all`
    - `latest`
    - `oldest`
    - `popularity`
    - `recommended`
  - caps page size at 2000 cards
  - `recommended` uses `req.user.profile` to score jobs by skills, branch keywords, location preference, and Graduation Year

- `GET /api/jobs/search`
- `POST /api/jobs/search`
  - canonical cursor-search path for `latest`, `oldest`, and `popularity`
  - returns `hasNextPage` and `nextCursor` instead of offset totals
  - uses `sortDate` and `_id` for stable cursor boundaries, with `clickCount` added for popularity sorting

- `GET /api/jobs/meta`
  - unscoped reads return summary-backed companies, cities, job types, and static taxonomy options
  - scoped reads stay live and query-shaped for premium users

- `GET /api/jobs/meta/companies`
  - bounded company autocomplete for the filter UI
  - applies the current scoped filters when premium users narrow the dataset

- `GET /api/jobs/stats`
  - public endpoint for landing-page counts
  - returns summary-backed total active jobs and total companies
  - sets a public cache header

- `GET /api/jobs/seo-feed`
  - public feed of active jobs with frontend URLs and SEO metadata

- `GET /api/jobs/:id`
  - returns one active job within the public location scope

- `POST /api/jobs/:id/click`
  - rate limited
  - deduplicates repeat click events for 24 hours
  - increments `Job.clickCount`
  - stores a `Click` document

## User Profile

Primary files:

- `src/routes/userRoutes.js`
- `src/controllers/userController.js`
- `src/models/User.js`

Endpoints:

- `GET /api/user/profile`
  - requires auth
  - returns the current user snapshot, nested profile, onboarding flag, and last login time

- `PUT /api/user/profile`
  - requires auth
  - rate limited
  - updates:
    - `name`
    - `branch`
    - `passingYear`
    - `skills`
    - `locationPreference`
  - normalizes and deduplicates list fields
  - automatically sets `onboardingCompleted = true` once branch, Graduation Year, skills, and location preference are all present

## Admin

Primary files:

- `src/routes/adminRoutes.js`
- `src/controllers/adminController.js`
- `src/models/AdminAudit.js`
- `src/models/ScraperStatus.js`
- `src/models/ScraperRun.js`
- `src/models/Subscription.js`

All admin routes require:

```text
  - protect -> authorize("admin")
```

- `GET /api/admin/stats`
  - user counts, job counts, click totals, active subscriptions, recent users, and jobs-added series

- `GET /api/admin/analytics/clicks`
  - click time series

- `GET /api/admin/analytics/clicks/locations`
  - top clicked cities

- `GET /api/admin/analytics/top-jobs`
  - top clicked jobs

- `GET /api/admin/analytics/user-growth`
  - user signup time series

- `GET /api/admin/users`
  - paginated user table with filters for search, role, and verified state

- `GET /api/admin/users/:id`
  - detailed user view with subscription state and recent click history

- `PUT /api/admin/users/:id/role`
  - can only assign `user` or `admin`
  - cannot change their own role

- `PUT /api/admin/users/:id/status`
  - toggles deactivation
  - cannot deactivate the caller
  - admins cannot change other admins

- `GET /api/admin/jobs`
  - paginated job table with filters for status, company, city, and search

- `PUT /api/admin/jobs/:id/status`
  - updates job status among `active`, `hidden`, and `expired`

- `GET /api/admin/audit`
  - paginated administrative audit log

- `GET /api/admin/scrape/status`
  - returns live scraper cards plus summary information

- `POST /api/admin/scrape/trigger`
  - super-admin only
  - rate limited
  - dispatches GitHub Actions workflow `scraper.yml`

- `PUT /api/admin/scraper/:id/toggle`
  - super-admin only
  - enables or disables a scraper source

Administrative writes record immutable audit events in `AdminAudit`.

## Scrape Status API

Primary files:

- `src/routes/scrapeRoutes.js`
- `src/controllers/scrapeController.js`

This is a smaller heartbeat-style route separate from the admin dashboard API:

- `GET /api/scrape/status`
  - requires admin auth
  - rate limited
  - returns a lightweight message plus the nominal schedule (`02:00 IST daily`)

## Scraper Persistence Flow

Primary files:

- `scraper-support/runner.js`
- `scraper-support/utils/saveToDB.js`
- `scraper-support/utils/scraperPersistence.js`
- `scraper-support/utils/indiaLocationFilter.js`
- `scraper-support/utils/cityNormalizer.js`
- `src/utils/jobLocations.js`

Live scraper flow:

1. The runner builds the source list.
2. In live mode it seeds `ScraperStatus`.
3. Each scraper runs with retry support.
4. Raw jobs are filtered to India-only listings.
5. `saveToDB()` rejects:
   - senior roles
   - invalid application URLs
   - jobs older than `SCRAPER_JOB_POSTED_WITHIN_DAYS` days when `postedAt` is present
6. Accepted jobs are normalized:
   - city and location fields
   - job type inference
   - canonical location label generation
7. A stable SHA-256 fingerprint is computed from `company`, `title`, and canonical city.
8. Jobs are bulk-upserted by fingerprint.
9. After a source write succeeds, stale jobs from that same source are removed.
   - if a scrape yields zero eligible jobs, stale cleanup is skipped and the previous source jobs are preserved
10. `ScraperStatus` is updated for each source.
   - partial zero-eligible refreshes set `lastPartialAt` and `lastPartialReason` without overwriting the last complete counts
11. A `ScraperRun` summary document is written for the full pipeline.

Dry-run flow:

1. The scraper runs against the real source.
2. India-filtered jobs are written to a local `jobs.json`.
3. MongoDB is not changed.

## Data Model Summary

- `User`
  - verified account
  - stores email, hashed password, role, profile, onboarding flag, verification flag, deactivation flag, and last login time

- `PendingUser`
  - temporary email-first registration record
  - stores profile name, verification token hash, resend state, and a 24-hour TTL `createdAt`

- `BlacklistedToken`
  - revoked session tokens after logout

- `Job`
  - normalized scraped listing
  - deduplicated by `fingerprint`
  - includes `status`, `locations`, `source`, `sourceUrl`, `postedAt`, and `clickCount`

- `Click`
  - immutable click analytics event
  - references a job and optionally a user

- `Subscription`
  - alert-preference document surfaced in admin views

- `AdminAudit`
  - immutable log of admin actions

- `ScraperStatus`
  - live per-source health and result summary

- `ScraperRun`
  - historical summary for a full scraper pipeline run

## Configuration Surface

Required for API startup:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGIN`

Required in production:

- one of `FRONTEND_ORIGIN` or `CORS_ORIGIN`
- one of `PUBLIC_API_ORIGIN`, `API_PUBLIC_ORIGIN`, or `BACKEND_PUBLIC_ORIGIN`

Required for verification emails:

- `BREVO_API_KEY`
- `BREVO_SENDER_NAME`
- `BREVO_SENDER_EMAIL`

Used by auth and deployment behavior:

- `NODE_ENV`
- `TRUST_PROXY`
- `AUTH_COOKIE_SAME_SITE`

Used by scraper execution:

- `SCRAPER_CONCURRENCY`
- `SCRAPER_JOB_POSTED_WITHIN_DAYS`
- `PUPPETEER_DISABLE_SANDBOX`

Required only for admin-triggered GitHub Actions runs:

- `GITHUB_PAT`
- `GITHUB_REPO`

## Operational Scripts

- `npm run dev`
  - starts the API with `nodemon`

- `npm start`
  - starts the API with `node`

- `npm test`
  - runs the Node test suite

- `npm run scrape`
  - runs the live scraper sequentially

- `npm run scrape:dry`
  - runs the scraper without writing to MongoDB

- `npm run scrape:parallel`
  - runs the live scraper with concurrency

- `npm run scrape:parallel:dry`
  - parallel dry-run mode

- `npm run db:clear`
  - clears jobs through `scripts/clearJobs.js`

- `npm run db:delete-user`
  - removes a user and related records through `scripts/sweepDeleteUser.js`

- `npm run db:verify-indexes`
  - validates and prints MongoDB indexes
