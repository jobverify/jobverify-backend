# Jobverify Backend

Express and MongoDB backend for Jobverify, with a separate scraper runtime that collects public job listings and writes normalized jobs into MongoDB.

## Tech Stack

- Node.js 24 (see .node-version)
- Express 5
- MongoDB with Mongoose
- JWT-based authentication
- Provider scrapers under `scraper/`, orchestrated by `scraper-support/`

## Repository Layout

```text
Jobverify-backend/
|-- src/                  Application source code
|   |-- app.js            HTTP composition without database startup
|   |-- config/           Validated HTTP process configuration
|   |-- runtime/          Maintenance scheduling and bounded shutdown
|   |-- controllers/      Route handlers
|   |-- middleware/       Auth, CSRF, validation, error handling
|   |-- models/           Mongoose models
|   |-- routes/           API route modules
|   |-- services/         Business logic
|   `-- utils/            Shared helpers and runtime config
|-- scraper/              Company-specific source adapters and nearby tests
|-- scraper-support/      Shared orchestration, engines, providers, and tests
|-- test/                 Backend API and service tests
|-- scripts/              Maintenance and reporting scripts
|-- db/                   Database bootstrap code
|-- server.js             Database/socket/background-task lifecycle
|-- Runbook.md            Setup and operational commands
`-- architecture.md       Runtime and design notes
```

## Testing Conventions

- Backend API and service tests live in `test/`.
- Shared scraper engine, fixture-based regression tests, and legacy scraper tests live in `scraper-support/tests/`.
- New scraper-specific tests can stay next to the scraper as `scraper/<company>/script.test.js`.
- Avoid reintroducing a top-level `tests/` folder. Keep backend tests in `test/` and shared scraper test assets under `scraper-support/tests/`.

Install dependencies with `npm ci`, then provision the local test database binary
when running MongoDB-backed checks. See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
npm run test:provision-mongo
npm run check
npm test
npm run test:integration
```

Remove local-only workspace artifacts:

```bash
npm run clean:workspace
```

This removes common generated noise such as `.cache/`, `coverage/`, `playwright-report/`, `test-results/`, `tmp/`, scraper `jobs.json` snapshots, and temporary scraper fixtures.

Install the locked dependencies from the repository root with `npm ci`.
There is no separate scraper package to install.

## Useful Commands

```bash
npm run dev
npm run lint
npm run coverage:companies
npm run scrape:dry
npm run scrape:csv -- --parallel --dry-run
```

## Cloudflare Turnstile

Login is protected by Turnstile when `TURNSTILE_SECRET_KEY` is configured. Set
the following backend environment variables in the deployment platform; never
put the secret in the frontend bundle:

```text
TURNSTILE_SECRET_KEY=<widget secret from Cloudflare>
TURNSTILE_ALLOWED_HOSTNAMES=<comma-separated frontend hostnames>
TURNSTILE_EXPECTED_ACTION=login
```

Use deployment hostnames only in production. The local defaults are
`localhost,127.0.0.1`.

## Razorpay Standard Checkout

To use Razorpay Test Mode, configure the backend environment with these variable
names (keep all credential values out of tracked files):

```text
PAYMENT_PROVIDER
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

Set `PAYMENT_PROVIDER` to `razorpay` and obtain the Test Mode key ID and secret
from Razorpay. Start the services from their respective repositories:

```bash
# jobverify-backend
npm run dev

# jobverify-frontend
npm run dev
```

After signing in, select a paid plan in the frontend. The authenticated flow
creates a plan-aware order through `POST /api/billing/checkout`, opens Razorpay
Standard Checkout with only the public key ID, and sends the completed payment
response to `POST /api/billing/verify`. The backend creates the order and
verifies the payment signature server-side before activating access. A successful
Test Mode payment activates the selected plan and refreshes the user's access.
Closing Checkout or a failed payment leaves the plan inactive and shows an error;
no access is granted.

For production, replace the Test Mode keys with production keys and configure a
Razorpay webhook endpoint at `POST /api/billing/webhook` with its corresponding
webhook secret in `RAZORPAY_WEBHOOK_SECRET`. Do not expose the key secret or
webhook secret to the frontend.

## Scraper company coverage

The scheduled workflow runs every day at 02:08 IST (20:38 UTC on the previous
calendar day). Himalayas and Wellfound publish individual vacancies only;
directory hiring signals are not jobs. Empty API results return no rows, while
network, challenge, malformed-page and incomplete-pagination failures remain
source failures. A Wellfound HTML snapshot can be incomplete, so its extracted
vacancies are upserted without recording misses for unseen jobs. Historic
`*-current-openings` aggregate records are rejected on ingestion and hidden
from public queries and alert delivery, including already-stored placeholders.
The summary version is bumped so cached public counts rebuild with this scope.
This change does not delete existing database records.

`company_coverage_report.json` is the authoritative inventory of cataloged,
disk-backed scraper providers. Refresh it after adding or removing a scraper:

```bash
npm run coverage:companies:sync
```

The refresh removes obsolete frontend coverage artifacts. `npm run
coverage:companies -- <csv>` only evaluates an external backlog against the
catalog and aliases; it does not refresh the scraper inventory.

To run only the companies listed in `../new_Companies.csv`, use:

```bash
npm run scrape:csv -- --parallel --dry-run
```

You can also point the command at a different CSV:

```bash
npm run scrape:csv -- ../path/to/company-list.csv --parallel --dry-run
```

## Public job API abuse protection

Jobverify keeps public job discovery open without requiring login. `GET /api/jobs`, `GET|POST /api/jobs/search`, and `GET /api/jobs/:id` are the guarded anonymous discovery routes. Job metadata, landing-page statistics, live hiring companies, and the SEO feed remain public and continue to rely on the existing coarse IP limits.

The in-memory abuse guard watches for rapid distinct page walking and bursts of distinct job-detail reads, then returns JSON-only throttling responses before the controllers do expensive database work. This is designed to be lightweight enough for Render Free and does not require Redis or another managed store.

The public discovery protection uses these environment variables:

- `PUBLIC_JOB_ABUSE_PAGE_WALK_WINDOW_MS=60000`
- `PUBLIC_JOB_ABUSE_PAGE_WALK_LIMIT=30`
- `PUBLIC_JOB_ABUSE_DETAIL_WINDOW_MS=60000`
- `PUBLIC_JOB_ABUSE_DETAIL_LIMIT=90`
- `PUBLIC_JOB_ABUSE_VIOLATION_WINDOW_MS=900000`
- `PUBLIC_JOB_ABUSE_VIOLATION_LIMIT=5`
- `PUBLIC_JOB_ABUSE_BLOCK_MS=900000`
- `PUBLIC_JOB_ABUSE_MAX_RECORDS=5000`

Operational notes:

- Public throttles return `429` with `Retry-After`, `Cache-Control: no-store`, and `error: "rate_limited"`.
- Repeated violations return temporary `403` responses with the same cache and retry headers plus `error: "access_denied"`.
- Set `TRUST_PROXY` correctly in Render so Express uses the real client IP instead of the load balancer hop.
- On Render Free, the abuse store is process-local, so counters can reset after a restart or free-tier spin-down. That is expected for this phase.
- A Cloudflare WAF or rate-limit rule can be added later as a separate manual production step, but this repository does not assume that Cloudflare protection is already configured.

For full setup, environment variables, and operational steps, see [Runbook.md](./Runbook.md).
## Telegram alert schedules

After linking Telegram, enabling alerts and saving at least one matching filter,
Profile shows **Telegram alert schedule**. Users can select immediate delivery,
a daily time, or a weekly weekday and time. All times use **Asia/Kolkata (IST)**.
Existing accounts retain their previous cadence until they save a Telegram
schedule.

Authenticated `GET` and CSRF-protected `PUT /api/user/telegram-alerts/schedule`
read and update the schedule. PUT accepts, for example:

```json
{"frequency":"weekly","isActive":true,"deliveryTime":"18:45","weeklyDay":"Friday"}
```

`deliveryTime` must be a 24-hour `HH:mm` time, and `weeklyDay` a full English
weekday name. Both fields remain saved when changing frequency. Setup must be
complete before using this endpoint. Pausing preserves matching queued jobs;
resuming or editing the schedule updates their due times.

The backend checks due alerts every minute and catches up after downtime. Only
matching queued jobs produce a message. Temporary Telegram failures stay queued
with retry backoff; an unavailable chat disables delivery until the user restores
Telegram access. Successfully acknowledged Telegram delivery rows are deleted
completely, including their snapshots and provider metadata. If deletion fails,
the sent state prevents a resend while the next recovery retries cleanup. Unsent
records, user accounts, preferences and source job listings are retained. Jobs
that are no longer active or no longer match are retained as skipped.

No sent-delivery receipt is retained: manually enqueueing an already-sent job
can send it again. The scraper normally enqueues only newly inserted jobs.

Deploy both frontend and backend, and apply the model index plan for the new
queue fields. No additional Telegram environment variables are required.
MongoDB must support replica-set transactions. Reliable delivery near the chosen
minute requires a continuously running backend: this repository's Render
blueprint uses the Free plan, which [spins down after 15 minutes without inbound
traffic](https://render.com/docs/free#spinning-down-on-idle). An idle instance
will catch up only when it starts again.
