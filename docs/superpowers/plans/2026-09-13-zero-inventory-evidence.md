# Zero-Inventory Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make zero-job results evidence-based, prevent placeholders and incorrect boards from counting as successful empty inventories, repair Autodesk, Air India, and Decathlon India, and produce a ranked remediation manifest for the remaining coverage gaps.

**Architecture:** Preserve the legacy array return contract and attach structured run evidence through a non-enumerable shared symbol. Provider hydration supplies a centralized zero-result policy, adapters attach evidence they can actually establish, the runner turns that evidence into mutually exclusive outcomes, and persistence authorizes empty lifecycle processing only for validated first-party evidence.

**Tech Stack:** Node.js 24 ESM, built-in `node:test`, existing fetch-based scraper engines, JSON provider catalogs.

**Spec:** `docs/superpowers/specs/2026-09-13-zero-inventory-evidence-design.md`

## Global Constraints

- Preserve the public array return contract for existing scrapers.
- An empty result is authoritative only with current first-party, complete-inventory evidence.
- Himalayas and Wellfound remain discovery-only and can never prove authoritative emptiness.
- Coverage gaps do not count as successful inventory runs and do not increment batch abort failures.
- Only verified empty evidence may expire or lifecycle-miss existing jobs.
- Preserve unrelated workspace changes. Because several target files already contain user edits, use exact-path diff checkpoints instead of automatically committing implementation files.
- Do not use sub-agents; workspace instructions disable them.

---

### Task 1: Shared inventory-evidence contract

**Files:**
- Create: `scraper-support/utils/inventoryEvidence.js`
- Create: `scraper-support/tests/inventoryEvidence.test.js`

**Interfaces:**
- Produces: `INVENTORY_EVIDENCE`, `attachInventoryEvidence(jobs, evidence)`, `readInventoryEvidence(jobs)`, `normalizeInventoryEvidence(evidence)`, `isVerifiedEmptyEvidence(evidence)`.
- Consumes: native `URL` validation and plain job arrays.

- [ ] **Step 1: Write the failing evidence tests**

```js
test('verified empty requires a current complete first-party HTTP surface', () => {
  const jobs = attachInventoryEvidence([], {
    status: 'verified-empty',
    surface: 'https://example.test/jobs',
    firstParty: true,
    listingComplete: true,
    pagesFetched: 1,
    reportedTotal: 0,
    verifiedAt: '2026-09-13T00:00:00.000Z',
    reason: 'validated-empty-response',
  })
  assert.equal(isVerifiedEmptyEvidence(readInventoryEvidence(jobs)), true)
  assert.deepEqual([...jobs], [])
  assert.equal(Object.keys(jobs).length, 0)
})

test('third-party and incomplete evidence cannot authorize an empty inventory', () => {
  for (const evidence of [
    { status: 'verified-empty', surface: 'https://example.test/jobs', firstParty: false, listingComplete: true },
    { status: 'verified-empty', surface: 'https://example.test/jobs', firstParty: true, listingComplete: false },
    { status: 'verified-empty', surface: 'mailto:jobs@example.test', firstParty: true, listingComplete: true },
  ]) assert.equal(isVerifiedEmptyEvidence(evidence), false)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test scraper-support/tests/inventoryEvidence.test.js`  
Expected: FAIL because `inventoryEvidence.js` does not exist.

- [ ] **Step 3: Implement the minimal evidence helpers**

```js
export const INVENTORY_EVIDENCE = Symbol.for('jobverify.inventory-evidence')

export const attachInventoryEvidence = (jobs, evidence) => {
  if (!Array.isArray(jobs)) throw new TypeError('Inventory evidence can only be attached to a jobs array')
  Object.defineProperty(jobs, INVENTORY_EVIDENCE, {
    configurable: true,
    value: normalizeInventoryEvidence(evidence),
  })
  return jobs
}

export const readInventoryEvidence = (jobs) => Array.isArray(jobs)
  ? jobs[INVENTORY_EVIDENCE] || null
  : null
```

`normalizeInventoryEvidence` copies only the documented fields and normalizes invalid evidence to `{ status: 'unverified', firstParty: false, listingComplete: false }`. `isVerifiedEmptyEvidence` checks status, first-party ownership, completeness, HTTP(S) URL, numeric zero total when present, and a valid current-run timestamp.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test scraper-support/tests/inventoryEvidence.test.js`  
Expected: PASS.

- [ ] **Step 5: Inspect the exact-path diff checkpoint**

Run: `git diff -- scraper-support/utils/inventoryEvidence.js scraper-support/tests/inventoryEvidence.test.js`

---

### Task 2: Central provider zero-result policies

**Files:**
- Modify: `scraper-support/providers/index.js`
- Create: `scraper-support/tests/providerZeroResultPolicy.test.js`
- Modify: `scraper-support/himalayasDirectory/engine.js`
- Modify: `scraper-support/wellfoundDirectory/engine.js`

**Interfaces:**
- Consumes: `attachInventoryEvidence` from Task 1.
- Produces: hydrated `provider.zeroResultPolicy` with exactly `coverage-gap`, `discovery-only`, or `evidence-required`.

- [ ] **Step 1: Write failing policy tests**

```js
test('provider hydration classifies sentinel, directory, and normal providers', () => {
  assert.equal(hydrateProviderCatalogEntry({ source: 'sentinel', adapter: 'script', atsPlatform: 'workbook-exact-name-sentinel' }).zeroResultPolicy, 'coverage-gap')
  assert.equal(hydrateProviderCatalogEntry({ source: 'directory', adapter: 'himalayasDirectory' }).zeroResultPolicy, 'discovery-only')
  assert.equal(hydrateProviderCatalogEntry({ source: 'live', adapter: 'script', atsPlatform: 'greenhouse' }).zeroResultPolicy, 'evidence-required')
})
```

Add adapter tests asserting an empty Himalayas or Wellfound response carries `status: 'discovery-only'`, `firstParty: false`, `listingComplete: true`, and the directory URL as `surface`.

- [ ] **Step 2: Run policy and directory tests and verify RED**

Run: `node --test scraper-support/tests/providerZeroResultPolicy.test.js scraper-support/tests/himalayasDirectoryScraper.test.js scraper-support/tests/wellfoundDirectoryScraper.test.js`  
Expected: FAIL because policy and directory evidence are absent.

- [ ] **Step 3: Implement centralized policy inference**

Add and export:

```js
export const resolveZeroResultPolicy = (provider = {}) => {
  if (['himalayasDirectory', 'wellfoundDirectory'].includes(provider.adapter)) return 'discovery-only'
  const metadata = [provider.atsPlatform, provider.backfillMode, provider.extractionStrategy].join(' ')
  if (/sentinel|verified-empty-state|exact-name-sentinel/i.test(metadata)) return 'coverage-gap'
  return 'evidence-required'
}
```

Hydration applies an explicit provider override first, then this resolver. Directory engines attach discovery-only evidence after successfully validating their complete directory response.

- [ ] **Step 4: Run policy and directory tests and verify GREEN**

Run: `node --test scraper-support/tests/providerZeroResultPolicy.test.js scraper-support/tests/himalayasDirectoryScraper.test.js scraper-support/tests/wellfoundDirectoryScraper.test.js`  
Expected: PASS.

- [ ] **Step 5: Inspect the exact-path diff checkpoint**

Run: `git diff -- scraper-support/providers/index.js scraper-support/himalayasDirectory/engine.js scraper-support/wellfoundDirectory/engine.js scraper-support/tests/providerZeroResultPolicy.test.js`

---

### Task 3: Workday empty-result safety and Autodesk repair

**Files:**
- Modify: `scraper-support/myworkday/engine.js`
- Modify: `scraper-support/providers/index.js`
- Modify: `scraper-support/myworkday/companies.json`
- Create: `scraper-support/tests/workdayInventoryEvidence.test.js`
- Create: `scraper-support/tests/autodeskWorkdayConfig.test.js`

**Interfaces:**
- Consumes: inventory-evidence helpers and hydrated `boardIdentityVerified`.
- Produces: Workday arrays carrying `complete-inventory`, `verified-empty`, or `unverified` evidence; never the legacy authoritative symbol by itself.

- [ ] **Step 1: Write failing Workday gate tests**

Use injected `global.fetch` responses with `{ total: 0, jobPostings: [] }`:

```js
test('Workday zero remains unverified without explicit board identity verification', async () => {
  const jobs = await runWorkdayScraper(buildOptions({ boardIdentityVerified: false }))
  assert.equal(readInventoryEvidence(jobs).status, 'unverified')
})

test('verified Workday board emits authoritative empty evidence', async () => {
  const jobs = await runWorkdayScraper(buildOptions({ boardIdentityVerified: true }))
  assert.equal(readInventoryEvidence(jobs).status, 'verified-empty')
  assert.equal(isVerifiedEmptyEvidence(readInventoryEvidence(jobs)), true)
})
```

The options fixture must use a valid Workday URL, India facet, JSON content type, numeric total, and one fetched page.

- [ ] **Step 2: Write the failing Autodesk configuration test**

```js
test('Autodesk uses its external Workday board rather than the university board', () => {
  const provider = getScraperCatalog().find(({ source }) => source === 'autodesk')
  assert.equal(provider.baseUrl, 'https://autodesk.wd1.myworkdayjobs.com/en-US/Ext')
  assert.equal(provider.boardIdentityVerified, true)
})
```

- [ ] **Step 3: Run both tests and verify RED**

Run: `node --test scraper-support/tests/workdayInventoryEvidence.test.js scraper-support/tests/autodeskWorkdayConfig.test.js`  
Expected: FAIL because Workday still marks any first-page zero authoritative and Autodesk points to `/uni`.

- [ ] **Step 4: Implement the Workday evidence gate**

Pass `boardIdentityVerified` from `createWorkdayScraper` to `runWorkdayScraper`. Replace `createAuthoritativeWorkdayEmptyResult()` with evidence attachment:

```js
const createWorkdayEmptyResult = ({ boardIdentityVerified, surface, pagesFetched, reportedTotal }) =>
  attachInventoryEvidence([], {
    status: boardIdentityVerified === true ? 'verified-empty' : 'unverified',
    surface,
    firstParty: true,
    listingComplete: true,
    pagesFetched,
    reportedTotal,
    indiaFacetCount: reportedTotal,
    verifiedAt: new Date().toISOString(),
    reason: boardIdentityVerified === true ? 'validated-workday-india-empty' : 'workday-board-identity-unverified',
  })
```

Non-empty complete Workday arrays receive `complete-inventory`. The runner may temporarily recognize the legacy symbol, but Workday no longer creates it without valid structured evidence.

- [ ] **Step 5: Correct Autodesk**

Set:

```json
{
  "name": "autodesk",
  "company": "Autodesk",
  "baseUrl": "https://autodesk.wd1.myworkdayjobs.com/en-US/Ext",
  "companyCareerPage": "https://autodesk.wd1.myworkdayjobs.com/EXT",
  "boardIdentityVerified": true
}
```

- [ ] **Step 6: Run Workday and Autodesk tests and verify GREEN**

Run: `node --test scraper-support/tests/workdayInventoryEvidence.test.js scraper-support/tests/autodeskWorkdayConfig.test.js scraper-support/tests/workdayScopeGuards.test.js scraper-support/tests/workdayEngineUrl.test.js`  
Expected: PASS.

- [ ] **Step 7: Inspect the exact-path diff checkpoint**

Run: `git diff -- scraper-support/myworkday/engine.js scraper-support/providers/index.js scraper-support/myworkday/companies.json scraper-support/tests/workdayInventoryEvidence.test.js scraper-support/tests/autodeskWorkdayConfig.test.js`

---

### Task 4: Runner zero-outcome normalization and persistence authorization

**Files:**
- Modify: `scraper-support/runner.js`
- Modify: `scraper-support/utils/saveToDB.js`
- Modify: `scraper-support/utils/failureClassification.js`
- Modify: `scraper-support/tests/runnerResume.test.js`
- Create: `scraper-support/tests/runnerZeroOutcome.test.js`
- Modify: `scraper-support/tests/scraperPersistenceFlow.test.js`

**Interfaces:**
- Consumes: provider `zeroResultPolicy`, raw jobs, India-filtered jobs, and structured inventory evidence.
- Produces: `resolveZeroJobOutcome(scraper, jobs, indiaJobs)` returning `verified-empty`, `fetched-zero`, `unverified-zero`, `coverage-gap`, `blocked-zero`, or `null`.

- [ ] **Step 1: Write failing outcome tests**

```js
test('coverage-gap provider is completed as a non-aborting coverage result', () => {
  const outcome = resolveZeroJobOutcome(
    { provider: { zeroResultPolicy: 'coverage-gap' } },
    [],
    [],
  )
  assert.equal(outcome, 'coverage-gap')
  assert.deepEqual(buildCoverageGapResult('sentinel', outcome), {
    success: false,
    softFailure: true,
    upstreamOutage: false,
    failureKind: 'coverage_gap',
    zeroJobEvidence: 'coverage-gap',
  })
})
```

Add separate tests for verified empty evidence, complete raw non-India inventory (`fetched-zero`), discovery-only zero (`blocked-zero`), and missing evidence (`unverified-zero`).

- [ ] **Step 2: Write persistence tests proving only verified evidence authorizes empty lifecycle work**

Exercise `saveToDB([], source, { authoritativeEmpty })` through the existing model stubs. Assert unverified, coverage-gap, and blocked results set `staleCheckSkipped`; verified empty permits `expireUnseen`.

- [ ] **Step 3: Run focused runner and persistence tests and verify RED**

Run: `node --test scraper-support/tests/runnerZeroOutcome.test.js scraper-support/tests/runnerResume.test.js scraper-support/tests/scraperPersistenceFlow.test.js`  
Expected: FAIL because the new outcome API and coverage result are absent.

- [ ] **Step 4: Implement outcome normalization**

```js
export const resolveZeroJobOutcome = (scraper, jobs, indiaJobs) => {
  if (!Array.isArray(indiaJobs) || indiaJobs.length > 0) return null
  if (scraper?.provider?.zeroResultPolicy === 'coverage-gap') return 'coverage-gap'
  const evidence = readInventoryEvidence(jobs)
  if (isVerifiedEmptyEvidence(evidence)) return 'verified-empty'
  if (evidence?.status === 'complete-inventory' && jobs.length > 0) return 'fetched-zero'
  if (evidence?.status === 'discovery-only') return 'blocked-zero'
  return 'unverified-zero'
}
```

Both sequential and parallel runner paths must use the same helper. Coverage gaps are checkpoint-complete but `success: false`, `softFailure: true`, and excluded by `isFailureCountedForAbort`. `authoritativeEmpty` is derived only from `zeroJobOutcome === 'verified-empty'`.

- [ ] **Step 5: Keep persistence fail-safe behavior explicit**

Rename internal boolean construction so `saveToDB` only accepts `options.authoritativeEmpty === true` from the normalized verified outcome. Preserve the existing `staleCheckSkipped` branch for every other empty input.

- [ ] **Step 6: Run focused runner and persistence tests and verify GREEN**

Run: `node --test scraper-support/tests/runnerZeroOutcome.test.js scraper-support/tests/runnerResume.test.js scraper-support/tests/scraperPersistenceFlow.test.js`  
Expected: PASS.

- [ ] **Step 7: Inspect the exact-path diff checkpoint**

Run: `git diff -- scraper-support/runner.js scraper-support/utils/saveToDB.js scraper-support/utils/failureClassification.js scraper-support/tests/runnerZeroOutcome.test.js scraper-support/tests/runnerResume.test.js scraper-support/tests/scraperPersistenceFlow.test.js`

---

### Task 5: Mutually exclusive summary reporting

**Files:**
- Modify: `scraper-support/finalSummaryFormatter.js`
- Modify: `test/finalSummaryFormatter.test.js`
- Modify: `scraper-support/tests/runReportFailures.test.js`

**Interfaces:**
- Consumes: runner result `zeroJobEvidence` and `failureKind`.
- Produces: a `Coverage` run-health status and exhaustive zero-yield categories.

- [ ] **Step 1: Write the failing summary partition test**

```js
test('summary separates coverage gaps from successful inventory runs', () => {
  const output = formatFinalSummaryTable({
    jobs: { success: true, jobs: 2, durationMs: 10 },
    empty: { success: true, jobs: 0, zeroJobEvidence: 'verified-empty', durationMs: 10 },
    outsideIndia: { success: true, jobs: 0, zeroJobEvidence: 'fetched-zero', durationMs: 10 },
    unknown: { success: true, jobs: 0, zeroJobEvidence: 'unverified-zero', durationMs: 10 },
    directory: { success: true, jobs: 0, zeroJobEvidence: 'blocked-zero', durationMs: 10 },
    placeholder: { success: false, softFailure: true, failureKind: 'coverage_gap', zeroJobEvidence: 'coverage-gap', jobs: 0, durationMs: 10 },
  })
  assert.match(output, /Successful\s+\| 5/)
  assert.match(output, /Coverage gaps\s+\| 1/)
  assert.match(output, /Verified empty career surfaces\s+\| 1/)
  assert.match(output, /Unverified zero results\s+\| 1/)
})
```

- [ ] **Step 2: Run formatter tests and verify RED**

Run: `node --test test/finalSummaryFormatter.test.js scraper-support/tests/runReportFailures.test.js`  
Expected: FAIL because coverage gaps currently appear as upstream issues and no coverage counter exists.

- [ ] **Step 3: Implement coverage status and exhaustive zero partitions**

`formatStatus` returns `Coverage` for `failureKind === 'coverage_gap'`. Counts initialize `{ OK: 0, Skip: 0, Coverage: 0, Upstream: 0, Fail: 0 }`. The run-health table adds `Coverage gaps`. The zero watchlist derives each category directly from `zeroJobEvidence`; coverage gaps are included even though they are not successful rows.

- [ ] **Step 4: Run formatter tests and verify GREEN**

Run: `node --test test/finalSummaryFormatter.test.js scraper-support/tests/runReportFailures.test.js`  
Expected: PASS and ASCII-only output.

- [ ] **Step 5: Inspect the exact-path diff checkpoint**

Run: `git diff -- scraper-support/finalSummaryFormatter.js test/finalSummaryFormatter.test.js scraper-support/tests/runReportFailures.test.js`

---

### Task 6: Air India official-surface scraper

**Files:**
- Modify: `scraper/airindia.workday/script.js`
- Modify: `scraper/airindia.workday/catalog.js`
- Create: `scraper-support/tests/airIndiaCurrentOpenings.test.js`
- Create: `scraper-support/tests/fixtures/airindia/current-openings.html`
- Create: `scraper-support/tests/fixtures/airindia/search-results.html`

**Interfaces:**
- Consumes: official `https://careers.airindia.com/go/` and same-origin listing-page HTML through injected `fetchHtml`.
- Produces: `createAirIndiaScraper({ fetchHtml, now })`, `extractAirIndiaOpeningLinks(html)`, and `run(options)` returning normalized India jobs with complete-inventory evidence.

- [ ] **Step 1: Capture bounded official fixtures**

Save only the minimal official markup needed to represent the current-openings handoff, individual listing cards, job title, India location, posting URL, and verified end-of-pagination marker. Do not store unrelated page prose or images.

- [ ] **Step 2: Write failing extraction and contract-drift tests**

```js
test('Air India extracts official India opening categories', async () => {
  const jobs = await createAirIndiaScraper({
    fetchHtml: async () => fixture,
    now: () => '2026-09-13T00:00:00.000Z',
  }).run()
  assert.ok(jobs.some(({ title, location }) => /Engineer/.test(title) && /Bangalore|Bengaluru|Gurugram|Kochi/.test(location)))
  assert.ok(jobs.every(({ company, country, applyUrl }) => company === 'Air India' && country === 'India' && /^https:\/\//.test(applyUrl)))
  assert.equal(readInventoryEvidence(jobs).status, 'complete-inventory')
})

test('Air India fails when the official current-openings contract disappears', async () => {
  await assert.rejects(createAirIndiaScraper({ fetchHtml: async () => '<html></html>' }).run(), /changed materially/)
})
```

- [ ] **Step 3: Run the Air India test and verify RED**

Run: `node --test scraper-support/tests/airIndiaCurrentOpenings.test.js`  
Expected: FAIL because the source is still a sentinel.

- [ ] **Step 4: Implement the official parser**

Validate the official heading and current-openings handoff, then follow same-origin listing pages to their verified end. Extract individual job title, India location, posting identifier, and same-origin or explicitly allowlisted Air India application URL. Emit publishable job records with `sourceListingComplete: true`, normalized source/apply URLs, and current timestamp. Throw on missing contracts, incomplete pagination, or unsafe URLs. Attach `complete-inventory` evidence only after the final listing page is verified.

- [ ] **Step 5: Update Air India catalog metadata**

Set `atsPlatform: 'official-company-careers'`, `companyCareerPage: 'https://careers.airindia.com/go/'`, and replace sentinel/backfill descriptions with the parser contract and 2026-09-13 verification date.

- [ ] **Step 6: Run Air India tests and verify GREEN**

Run: `node --test scraper-support/tests/airIndiaCurrentOpenings.test.js`  
Expected: PASS.

- [ ] **Step 7: Inspect the exact-path diff checkpoint**

Run: `git diff -- scraper/airindia.workday/script.js scraper/airindia.workday/catalog.js scraper-support/tests/airIndiaCurrentOpenings.test.js scraper-support/tests/fixtures/airindia/current-openings.html`

---

### Task 7: Decathlon India official-offers scraper

**Files:**
- Modify: `scraper/decathlonindia.workday/script.js`
- Modify: `scraper/decathlonindia.workday/catalog.js`
- Create: `scraper-support/tests/decathlonIndiaCurrentOpenings.test.js`
- Create: `scraper-support/tests/fixtures/decathlonindia/job-offers.html`

**Interfaces:**
- Consumes: official `https://joinus.decathlon.in/en/annonces` HTML through injected `fetchHtml`.
- Produces: `createDecathlonIndiaScraper({ fetchHtml, now })`, `extractDecathlonOfferLinks(html)`, and `run(options)` returning normalized India jobs with complete-inventory evidence.

- [ ] **Step 1: Capture a bounded official fixture**

Keep two representative offer cards containing title, Bengaluru/India location, contract type, posting URL, and pagination/end-state marker.

- [ ] **Step 2: Write failing extraction and contract-drift tests**

```js
test('Decathlon India extracts official offer cards', async () => {
  const jobs = await createDecathlonIndiaScraper({
    fetchHtml: async () => fixture,
    now: () => '2026-09-13T00:00:00.000Z',
  }).run()
  assert.deepEqual(jobs.map(({ title }) => title), ['Field Test Engineer', 'Communication Designer'])
  assert.ok(jobs.every(({ country, applyUrl }) => country === 'India' && applyUrl.startsWith('https://joinus.decathlon.in/en/annonce/')))
  assert.equal(readInventoryEvidence(jobs).status, 'complete-inventory')
})

test('Decathlon India rejects a changed offers shell', async () => {
  await assert.rejects(createDecathlonIndiaScraper({ fetchHtml: async () => '<html></html>' }).run(), /changed materially/)
})
```

- [ ] **Step 3: Run the Decathlon India test and verify RED**

Run: `node --test scraper-support/tests/decathlonIndiaCurrentOpenings.test.js`  
Expected: FAIL because the source is still a sentinel.

- [ ] **Step 4: Implement the official parser**

Validate the Decathlon India offer-list shell, extract only `/en/annonce/` links from `joinus.decathlon.in`, normalize title/location/contract fields, reject unsafe or non-India offers, and follow pagination only when a verified next-page URL exists. Attach complete-inventory evidence only after reaching the verified end state; throw on malformed pagination or contract drift.

- [ ] **Step 5: Update Decathlon catalog metadata**

Set `atsPlatform: 'official-company-careers'`, the official offers URL, parser/pagination strategy, and 2026-09-13 verification summary.

- [ ] **Step 6: Run Decathlon India tests and verify GREEN**

Run: `node --test scraper-support/tests/decathlonIndiaCurrentOpenings.test.js`  
Expected: PASS.

- [ ] **Step 7: Inspect the exact-path diff checkpoint**

Run: `git diff -- scraper/decathlonindia.workday/script.js scraper/decathlonindia.workday/catalog.js scraper-support/tests/decathlonIndiaCurrentOpenings.test.js scraper-support/tests/fixtures/decathlonindia/job-offers.html`

---

### Task 8: Ranked coverage-gap remediation manifest

**Files:**
- Create: `scripts/reportZeroInventoryRemediation.js`
- Create: `scraper-support/tests/zeroInventoryRemediationReport.test.js`
- Create: `artifacts/zero-inventory-remediation.json` by running the script.

**Interfaces:**
- Consumes: a run-state JSON path, `company_coverage_report.json`, and hydrated provider policies.
- Produces: JSON with summary counts plus rows sorted by policy priority, workbook rank, verification age, and source.

- [ ] **Step 1: Write the failing report test**

```js
test('remediation report prioritizes coverage gaps before discovery-only and unverified zeros', () => {
  const report = buildZeroInventoryRemediationReport({ runState, coverageRows, providers })
  assert.deepEqual(report.rows.map(({ source }) => source), ['sentinel', 'directory', 'unknown'])
  assert.deepEqual(report.summary, {
    zeroIndia: 3,
    rawZero: 3,
    coverageGap: 1,
    discoveryOnly: 1,
    evidenceRequired: 1,
  })
})
```

- [ ] **Step 2: Run the report test and verify RED**

Run: `node --test scraper-support/tests/zeroInventoryRemediationReport.test.js`  
Expected: FAIL because the report module does not exist.

- [ ] **Step 3: Implement deterministic report generation**

Export `buildZeroInventoryRemediationReport({ runState, coverageRows, providers })` and keep CLI parsing in a direct-execution block. Each row includes `source`, `companyName`, `zeroResultPolicy`, `adapter`, `atsPlatform`, `workbookRank`, `verifiedOn`, `companyCareerPage`, `rawRecords`, and `priorityReason`.

- [ ] **Step 4: Run the report test and verify GREEN**

Run: `node --test scraper-support/tests/zeroInventoryRemediationReport.test.js`  
Expected: PASS.

- [ ] **Step 5: Generate the real remediation artifact**

Run:

```powershell
node scripts/reportZeroInventoryRemediation.js `
  --run-state ..\artifacts\run-logs\local-scrape-20260912T232232-resilient\run-state.json `
  --output ..\artifacts\zero-inventory-remediation.json
```

Expected summary: 3,457 zero-India sources partitioned without overlap, with 3,409 raw-zero sources.

- [ ] **Step 6: Inspect the exact-path diff checkpoint**

Run: `git diff -- scripts/reportZeroInventoryRemediation.js scraper-support/tests/zeroInventoryRemediationReport.test.js`

---

### Task 9: Regression and operational verification

**Files:**
- Verify all files changed in Tasks 1-8.
- Update: `docs/superpowers/plans/2026-09-13-zero-inventory-evidence.md` checkboxes as each verification completes.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: fresh test, lint, classification, and live-source evidence.

- [ ] **Step 1: Run the complete focused suite**

Run:

```powershell
node --test `
  scraper-support/tests/inventoryEvidence.test.js `
  scraper-support/tests/providerZeroResultPolicy.test.js `
  scraper-support/tests/workdayInventoryEvidence.test.js `
  scraper-support/tests/autodeskWorkdayConfig.test.js `
  scraper-support/tests/runnerZeroOutcome.test.js `
  test/finalSummaryFormatter.test.js `
  scraper-support/tests/airIndiaCurrentOpenings.test.js `
  scraper-support/tests/decathlonIndiaCurrentOpenings.test.js `
  scraper-support/tests/zeroInventoryRemediationReport.test.js
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run scraper-support regressions**

Run: `npm run test:scraper`  
Expected: zero failures. Pre-existing failures must be recorded separately and demonstrated on the pre-change baseline before being classified as unrelated.

- [ ] **Step 3: Run syntax lint**

Run: `npm run lint`  
Expected: exit code 0.

- [ ] **Step 4: Re-run the 2026-09-12 artifact classifier**

Run: `node ../artifacts/run-logs/local-scrape-20260912T232232-resilient/analyze-zero-raw.mjs --write`  
Expected: immutable checkpoint partition remains 3,409 raw-zero plus 48 non-India-only; current source-policy classification reflects the migrated Autodesk, Air India, and Decathlon providers.

- [ ] **Step 5: Perform bounded live verification**

Run Autodesk, Air India, and Decathlon only with current official surfaces. Expected: Autodesk returns India jobs from `Ext`; Air India and Decathlon return at least one safe official India opening or fail explicitly on contract drift, never a silent authoritative zero.

- [ ] **Step 6: Review final diffs without disturbing unrelated changes**

Run: `git diff --check` followed by exact-path `git diff` for every Task 1-8 production and test file. Confirm no unrelated user edits were reverted.
