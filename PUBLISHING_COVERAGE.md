# Publishing coverage and scraper remediation

The company coverage report measures **catalog registration coverage**. A matched
company name, a script directory, or a historical verification note does not prove
that an integration can currently extract jobs. Public analytics continues to count
distinct company names with eligible active jobs using the existing visibility rules.

## Reproduce the baseline

Run these commands from `jobverify-backend`:

```powershell
npm run coverage:publishing:snapshot
npm run coverage:publishing -- --runtime ../artifacts/publishing-gap/baseline-runtime.json --output ../artifacts/publishing-gap/baseline
```

The snapshot command reads MongoDB without creating indexes, collections, leases,
or jobs. Database credentials come from the existing environment and are never
written to the report. A connection or query failure produces an explicitly
unavailable snapshot; it cannot become a zero inventory.

For a fresh combined read:

```powershell
npm run coverage:publishing -- --mongo --output ../artifacts/publishing-gap/current
```

Add `--run-state <checkpoint.json>` to include a specific interrupted or completed
run. Checkpoint observations are used only when newer than the saved attempt.
`--now <ISO timestamp>` and `--max-age-hours <hours>` support reproducible comparisons;
the default freshness window is 48 hours. Reports contain `report.json`,
`companies.csv`, `remediation-backlog.json`, and the input runtime snapshot when supplied.

## Interpret the report

- Implementation type and runtime outcome are independent of publication. A
  placeholder or failed latest run may still have previously saved public jobs.
- Raw, India, eligible, saved, and visible counts describe different pipeline
  boundaries. Unknown counters are JSON `null` and blank CSV cells.
- `rawJobs` counts records returned by the provider adapter; some adapters already
  scope their output to India. `upstreamReportedJobs` retains the full ATS inventory
  count independently when the provider supplies it.
- Legacy status counters can survive failures and partial runs. Only the new
  `latestAttempt` supplies exact current extraction counts; legacy `lastSuccess`
  alone is not evidence of a complete successful check.
- Verified empty inventories require fresh first-party inventory evidence. A
  zero from a sentinel, a missing artifact, or an old metadata note is unverified.
- Complete-check totals count observed fresh checks, not inferred historical
  successes. The report exposes sources missing attempt diagnostics separately.
- Reconciliation reports multiple sources sharing one public company name,
  publications under aliases, and jobs from sources outside the current catalog.
  Do not subtract source counts from company-name counts as if they had equal grain.

## Repair and validate

Only promote a source after fetching an official company page that binds its ATS
and verifying explicit India roles with descriptions and application links. Use
shared ATS extractors and preserve complete-inventory evidence and lifecycle guards.
Rank verified candidates by adapter reuse, current India opening count descending,
then source ID. Keep unverified and inaccessible candidates in the backlog.

Use bounded source selections and isolated dry-run outputs for trials. Validate
normalization, persistence, and public visibility in a temporary local MongoDB
before any live rollout. Roll out selected integrations in batches of ten and
compare a new snapshot against the baseline; monitor the next scheduled run.
Never count a dry-run extraction as a published company or use unrestricted
catalog execution as a shortcut for targeted validation.

```powershell
npm run coverage:publishing:validate -- --trials ../artifacts/publishing-gap/live-trials --runtime ../artifacts/publishing-gap/baseline-runtime.json
npm run coverage:publishing:rollout
# Apply only the reviewed, locally validated release:
npm run coverage:publishing:rollout -- --apply
```

The rollout command defaults to a plan. Applying requires all 50 trial payloads to
match their local validation hashes, fresh complete evidence, verified bindings,
and enabled source status. It performs targeted upserts in five batches, checks
public visibility after each, and records progress under `artifacts/publishing-gap/`.
Alerts and lifecycle replacement are disabled for this bounded backfill.

The scraper workflow generates and uploads publishing coverage after each run.
After deploying the code, inspect the next `scraper-run-*` artifact: the 50 sources
should have fresh attempt diagnostics, complete evidence, and public jobs. The
existing daily schedule is 02:08 Asia/Kolkata. Source deployment and a later
scheduled run are separate from a successful live database backfill.

## Continue across the full catalog

The discovery pass visits the registered official surfaces and recognizes exact
Greenhouse, Ashby, and Lever links. Missing domains, inaccessible pages, and
unsupported platforms remain discovery gaps. A positive API response from a
guessed tenant cannot establish employer identity. Redirects following acquisitions
or renames need identity review, and sources sharing a published ATS board need
alias reconciliation before promotion.

```powershell
node scripts/remediateScraperCatalog.js --runtime ../artifacts/catalog-remediation/after-rollout-runtime.json --output ../artifacts/catalog-remediation --concurrency 8
node scripts/auditCatalogExtractions.js --runtime ../artifacts/catalog-remediation/after-rollout-runtime.json --output ../artifacts/catalog-extractions --concurrency 8
```

Both commands resume fresh per-source artifacts. Use `--sources a,b` for bounded
rechecks, `--refresh` to replace observations, and `--include-published` to audit
published sources too. The extraction audit runs each executable source in a
separate Node permission sandbox with database connections blocked. Repository
writes and subprocesses are denied; browser-dependent sources can therefore be
reported as audit-blocked and require a separately supervised browser trial.
An audit-blocked source is not a verified empty inventory. Each source has a
45-second audit timeout, independent of its normal runner timeout.

Darwinbox inventory evidence checks unique upstream IDs, reported totals,
pagination exhaustion, and caller limits. Company wrappers preserve this evidence
when mapping results. Limited results carry `sourceListingComplete: false` so
ingestion preserves previous vacancies.

Extend the existing report with discovery and extraction evidence:

```powershell
node scripts/analyzeCoverageJobGaps.js --publishing --runtime ../artifacts/catalog-remediation/current-runtime.json --discovery ../artifacts/catalog-remediation/catalog-outcomes.json --extraction-audits ../artifacts/catalog-remediation/combined-extractions.json --output ../artifacts/catalog-remediation/final
```

Exploratory evidence has its own timestamps and freshness flags; it never replaces
production attempts or visible counts. Zero India roles in one supported feed
does not establish zero openings across every company recruitment channel.

Subsequent reviewed campaigns can use `--provider-manifest <json>` for trials and
rollout, and `--expected-sources <count>` for rollout. The default release still
requires the original 50. Every promoted payload must match local validation
hashes and pass visibility checks; subsequent batches contain at most ten sources.
