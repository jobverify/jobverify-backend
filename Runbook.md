# Jobify Backend Execution Guide

This guide explains how to install, configure, run, and operate the backend and scraper from this repository.

The HTTP examples use PowerShell syntax and `curl.exe`. In PowerShell, plain `curl` can resolve to `Invoke-WebRequest`, which behaves differently from curl.

## Prerequisites

- Node.js 18 or newer.
- npm.
- MongoDB connection string.
- Brevo transactional email credentials if registration emails must be delivered.
- GitHub token and repository name only if using the admin endpoint that triggers scraper GitHub Actions.
- A public frontend origin and public backend origin when running outside localhost.

## Install Dependencies

Install root backend dependencies:

```powershell
npm install
```

Install scraper dependencies from the nested scraper package:

```powershell
npm install --prefix scraper
```

The scraper has its own `package.json` because Puppeteer dependencies are declared under `scraper/`.

Remove local-only generated artifacts when the backend folder gets noisy:

```powershell
npm run clean:workspace
```

## Create Backend Environment File

Create or confirm a `.env` file in the repository root:

```dotenv
PORT=5000
MONGO_URI=<mongodb-connection-string>
JWT_SECRET=<long-random-secret>
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
FRONTEND_ORIGIN=http://localhost:5173
PUBLIC_API_ORIGIN=http://localhost:5000
TRUST_PROXY=0
NODE_ENV=development
SCRAPER_CONCURRENCY=3

BREVO_API_KEY=<brevo-api-key>
BREVO_SENDER_NAME=Jobify
BREVO_SENDER_EMAIL=<verified-sender-email>

GITHUB_PAT=<optional-github-token>
GITHUB_REPO=<optional-owner/repository>
```

Notes:

- Keep real credentials out of documentation and commits.
- `CORS_ORIGIN` is comma-separated. If `FRONTEND_ORIGIN` is not set, the first origin is used for email verification redirects.
- `FRONTEND_ORIGIN` should be the browser origin of the frontend app, for example `https://jobify-frontend.onrender.com`.
- `PUBLIC_API_ORIGIN` should be the public HTTPS origin of this backend service, for example `https://jobify-backend.onrender.com`.
- `TRUST_PROXY` defaults to disabled. Set it to `1` only when the backend is behind exactly one trusted reverse proxy that overwrites `X-Forwarded-For`.
- `GITHUB_PAT` and `GITHUB_REPO` are only needed for `POST /api/admin/scrape/trigger`.
- Start new environments from `.env.example`.

## Run the Backend

Development mode with automatic restart:

```powershell
npm run dev
```

Production-style local run:

```powershell
npm start
```

With `PORT=5000`, the backend listens at:

```text
http://localhost:5000
```

Health check:

```powershell
curl.exe http://localhost:5000/
```

Expected response:

```text
Hello from the Jobify Backend!
```

Dedicated health endpoint:

```powershell
curl.exe http://localhost:5000/health
```

Expected response includes:

```json
{"status":"ok"}
```

## Stop The Backend Server

If the backend is running in the current terminal with `npm run dev` or `npm start`, stop it with:

```text
Ctrl+C
```

If the backend was started in the background by a local automation script, check whether a PID file exists:

```powershell
Test-Path .codex\run-logs\backend.pid
```

If the PID file exists, stop that process:

```powershell
$backendPid = Get-Content .codex\run-logs\backend.pid
Stop-Process -Id $backendPid
```

If there is no PID file, stop whichever process is listening on the backend port.

Default backend port:

```text
5000
```

PowerShell:

```powershell
$backendPid = (Get-NetTCPConnection -LocalPort 5000 -State Listen).OwningProcess
Stop-Process -Id $backendPid
```

Verify the server is stopped: 

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen
```

If this prints nothing, no process is listening on port `5000`.

You can also verify with: 

```powershell
curl.exe http://localhost:5000/
```

After the server is stopped, this request should fail to connect.

## API Base Paths

```text
/api/auth
/api/jobs
/api/user
/api/scrape
/api/admin
```

Useful unauthenticated checks:

```powershell
curl.exe http://localhost:5000/api/jobs/stats
curl.exe http://localhost:5000/api/jobs/meta
curl.exe "http://localhost:5000/api/jobs?page=1&limit=20"
```

Authenticated endpoints require:

```text
Authorization: Bearer <jwt-token>
```

Admin endpoints require a user with role `admin`.

## Authentication Commands

Register:

```powershell
curl.exe -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

Login:

```powershell
curl.exe -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

Get profile:

```powershell
curl.exe http://localhost:5000/api/user/profile `
  -H "Authorization: Bearer <jwt-token>"
```

Logout:

```powershell
curl.exe -X POST http://localhost:5000/api/auth/logout `
  -H "Authorization: Bearer <jwt-token>"
```

## Scraper Commands

Run all scrapers sequentially and save to MongoDB:

```powershell
npm run scrape
```

Run all scrapers sequentially without writing to MongoDB:

```powershell
npm run scrape:dry
```

Run all scrapers in parallel and save to MongoDB:

```powershell
npm run scrape:parallel
```

Run all scrapers in parallel without writing to MongoDB:

```powershell
npm run scrape:parallel:dry
```

```powershell
cd jobverify-backend
$env:SCRAPER_CONCURRENCY = "10"
$env:WORKDAY_DETAIL_FETCH_CONCURRENCY = "1"
$env:NODE_OPTIONS = "--use-system-ca"
$runStamp = Get-Date -Format "yyyyMMddTHHmmss"
$logDir = "..\artifacts\run-logs\local-scrape-$runStamp"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
npm run scrape:parallel:dry 2>&1 | Tee-Object -FilePath "$logDir\pipeline.log"
```

Equivalent direct commands:

```powershell
node --use-system-ca scraper/runner.js
node --use-system-ca scraper/runner.js --dry-run
node --use-system-ca scraper/runner.js --parallel
node --use-system-ca scraper/runner.js --parallel --dry-run
```

### Run A Specific Source Or Resume An Interrupted Run

Run one or more named sources without clearing jobs from other sources:

```powershell
$env:SCRAPER_ONLY = "google,rubrik"
npm run scrape:parallel
Remove-Item Env:SCRAPER_ONLY
```

Resume at a source (including that source) after an interruption. The resume mode preserves jobs from sources before the restart point:

```powershell
$env:SCRAPER_START_AT = "lilt"
npm run scrape:parallel
Remove-Item Env:SCRAPER_START_AT
```

To continue strictly after a source that completed successfully, use `SCRAPER_START_AFTER` instead:

```powershell
$env:SCRAPER_CONCURRENCY = "20"
$env:SCRAPER_START_AFTER = "eko"
$runStamp = Get-Date -Format "yyyyMMddTHHmmss"
$logDir = "..\artifacts\run-logs\local-scrape-$runStamp"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
npm run scrape:parallel:dry 2>&1 | Tee-Object -FilePath "$logDir\pipeline-batch2.log"
Remove-Item Env:SCRAPER_START_AFTER
```

Use only one of `SCRAPER_ONLY`, `SCRAPER_START_AT`, or `SCRAPER_START_AFTER` for a run. For the interrupted 30 July 2026 run, restart at `eko` so that its failed attempt is retried before the remaining catalog is processed.

For an unattended local run, capture output to a timestamped log while preserving the console output:

```powershell
$runStamp = Get-Date -Format "yyyyMMddTHHmmss"
$logDir = "..\artifacts\run-logs\local-scrape-$runStamp"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
npm run scrape:parallel 2>&1 | Tee-Object -FilePath "$logDir\pipeline.log"
```

Before a broad live run, use the dry-run variant to confirm the environment and scraper behavior:

```powershell
$env:SCRAPER_START_AT = "eko"
npm run scrape:parallel:dry
Remove-Item Env:SCRAPER_START_AT
```

Dry-run output files are written under each scraper folder, for example:

```text
scraper/google/jobs.json
scraper/rubrik/jobs.json
scraper-support/myworkday/<source>/jobs.json
```

## Admin Scraper Control

Check scrape endpoint status:

```powershell
curl.exe http://localhost:5000/api/scrape/status `
  -H "Authorization: Bearer <admin-jwt-token>"
```

Check admin scraper dashboard status:

```powershell
curl.exe http://localhost:5000/api/admin/scrape/status `
  -H "Authorization: Bearer <admin-jwt-token>"
```

Trigger scraper GitHub Actions workflow:

```powershell
curl.exe -X POST http://localhost:5000/api/admin/scrape/trigger `
  -H "Authorization: Bearer <admin-jwt-token>"
```

This trigger requires `GITHUB_PAT` and `GITHUB_REPO` in `.env`. The code dispatches the `scraper.yml` workflow on the `main` branch.

Toggle a scraper source:

```powershell
curl.exe -X PUT http://localhost:5000/api/admin/scraper/<scraper-status-id>/toggle `
  -H "Authorization: Bearer <admin-jwt-token>" `
  -H "Content-Type: application/json" `
  -d "{\"isActive\":false}"
```

## Database Maintenance Commands

Verify and synchronize indexes:

```powershell
npm run db:verify-indexes
```

Delete all jobs in non-production mode:

```powershell
npm run db:clear -- --confirm
```

Delete a user and associated pending user, subscription, and click records in non-production mode:

```powershell
npm run db:delete-user -- user@example.com
```

Repair normalized city values across jobs:

```powershell
node scripts/repairCities.js
```

## Common Development Flow

1. Install dependencies:

```powershell
npm install
npm install --prefix scraper
```

2. Clean any old local scraper output or temp artifacts if needed:

```powershell
npm run clean:workspace
```

3. Create the root `.env` file.

4. Start the backend:

```powershell
npm run dev
```

5. In a separate terminal, run a dry scraper check:

```powershell
npm run scrape:dry
```

6. If dry-run output looks correct, run live scraping:

```powershell
npm run scrape
```

7. Verify API data:

```powershell
curl.exe "http://localhost:5000/api/jobs?page=1&limit=20"
```

## Troubleshooting

### Server exits during startup

Check that these keys exist in root `.env`:

```text
PORT
MONGO_URI
JWT_SECRET
CORS_ORIGIN
```

The server intentionally throws if required startup configuration is missing.

In production, also confirm:

```text
FRONTEND_ORIGIN (or a production-first CORS_ORIGIN)
```

`PUBLIC_API_ORIGIN` is optional and only needed if another integration needs a canonical public backend URL.

### MongoDB connection fails

Check:

- The `MONGO_URI` value is valid.
- The database user credentials are valid.
- The current network/IP is allowed by MongoDB Atlas.
- The target database name is present in the connection string.

### Registration works but email is not received

Check:

- `BREVO_API_KEY`
- `BREVO_SENDER_NAME`
- `BREVO_SENDER_EMAIL`
- Brevo sender verification.
- Backend logs for `[Email Failure]`.

### Scraper fails because Puppeteer modules are missing

Install nested scraper dependencies:

```bash
npm install --prefix scraper
```

### Parallel scraper is too heavy

Reduce concurrency in `.env`:

```dotenv
SCRAPER_CONCURRENCY=1
```

Then run:

```powershell
npm run scrape:parallel
```

## Render Deployment

This repo now includes `render.yaml` for a Render web service.

Manual Render settings:

- Runtime: `Node`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/health`

Required Render environment variables:

- `MONGO_URI`
- `CORS_ORIGIN`
- `FRONTEND_ORIGIN`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`

Recommended Render values:

- `NODE_ENV=production`
- `TRUST_PROXY=1`
- Allow Render to inject `PORT`
- Use a generated or long random `JWT_SECRET`

Optional admin-only variables:

- `GITHUB_PAT`
- `GITHUB_REPO`
