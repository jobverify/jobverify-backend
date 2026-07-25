# Jobify Backend

## Release: 26.07.02

Express and MongoDB backend for Jobify, with a separate scraper runtime that collects public job listings and writes normalized jobs into MongoDB.

## Tech Stack

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT-based authentication
- Puppeteer-based scraper runtime under `scraper/`

## Repository Layout

```text
Jobify-backend/
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
- Shared scraper engine, fixture-based regression tests, and legacy scraper tests live in `scraper/tests/`.
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
```

For full setup, environment variables, and operational steps, see [RUNBOOK.md](./RUNBOOK.md).
