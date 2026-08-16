# Jobverify Backend

## Test Release:  26.07.04

Express and MongoDB backend for Jobverify, with a separate scraper runtime that collects public job listings and writes normalized jobs into MongoDB.

## Tech Stack

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT-based authentication
- Puppeteer-based scraper runtime under `scraper/`

## Repository Layout

```text
Jobverify-backend/
|-- src/                  Application source code
|   |-- controllers/      Route handlers
|   |-- middleware/       Auth, CSRF, validation, error handling
|   |-- models/           Mongoose models
|   |-- routes/           API route modules
|   |-- services/         Business logic
|   `-- utils/            Shared helpers and runtime config
|-- scraper/              Scraper runner, source scrapers, shared engines
|   |-- <company>/        Company-specific scraper and local test files when needed
|   |-- providers/        Provider registry and aliases
|   |-- tests/            Shared scraper regression tests, fixtures, and legacy scraper tests
|   `-- utils/            Scraper-specific helpers
|-- test/                 Backend API and service tests
|-- scripts/              Maintenance and reporting scripts
|-- db/                   Database bootstrap code
|-- server.js             API entry point
|-- RUNBOOK.md            Setup and operational commands
`-- ARCHITECTURE.md       Runtime and design notes
```

## Testing Conventions

- Backend API and service tests live in `test/`.
- Shared scraper engine, fixture-based regression tests, and legacy scraper tests live in `scraper-support/tests/`.
- New scraper-specific tests can stay next to the scraper as `scraper/<company>/script.test.js`.
- Avoid reintroducing a top-level `tests/` folder. Keep backend tests in `test/` and scraper test assets under `scraper/`.

Run all tests:

```bash
npm test
```

Remove local-only workspace artifacts:

```bash
npm run clean:workspace
```

This removes common generated noise such as `.cache/`, `coverage/`, `playwright-report/`, `test-results/`, `tmp/`, scraper `jobs.json` snapshots, and temporary scraper fixtures.

Install scraper dependencies if needed:

```bash
npm install --prefix scraper
```

## Useful Commands

```bash
npm run dev
npm run lint
npm run coverage:companies
npm run scrape:dry
npm run scrape:csv -- --parallel --dry-run
```

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

For full setup, environment variables, and operational steps, see [RUNBOOK.md](./RUNBOOK.md).
## WhatsApp alerts

- `WHATSAPP_PROVIDER` selects `mock` or `meta`
- `WHATSAPP_ENABLED=true` enables live delivery
- `WHATSAPP_DEFAULT_COUNTRY_CODE=IN` normalizes local 10-digit mobile numbers
- `WHATSAPP_RETRY_COUNT` and `WHATSAPP_RETRY_DELAY_MS` control bounded retries
- `WHATSAPP_SEND_TIMEOUT_MS` bounds each provider attempt and aborts Meta sends that overrun that limit
- `WHATSAPP_CLAIM_TTL_MS` controls how long a claimed delivery row stays owned before recovery may reclaim it
- `WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM=false` keeps pre-lease `queued + lastAttemptAt` rows fenced off by default during mixed-version rollouts

Legacy reclaim rollout note:

- Leave `WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM=false` while any older backend worker that still uses `queued + lastAttemptAt` ownership might be alive.
- After older workers are drained, operators can temporarily set the flag to any accepted true value (`1`, `true`, `yes`, `on`) to recover stranded legacy rows, then return it to `false`.
