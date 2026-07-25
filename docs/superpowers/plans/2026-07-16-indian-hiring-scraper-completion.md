# Indian Hiring Scraper Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise `indian_hiring_companies_1000.csv` coverage by fixing catalog gaps, wiring already-implemented scrapers, and parallelizing new company scraper implementation batches.

**Architecture:** The shared provider catalog remains the single source of truth for coverage, so company-specific workers should own only their company folders and tests while the controller integrates `customProviders.json` and `companyAliases.json` centrally. We prioritize low-risk catalog wiring first, then run six parallel worker batches against disjoint company sets, and verify progress with coverage and focused regression tests after each wave.

**Tech Stack:** Node.js ESM, `node:test`, JSON-backed provider catalog, custom scraper modules under `scraper/<source>/`, coverage reporting via `scripts/reportCompanyCoverage.js`

## Global Constraints

Keep all writes inside `Jobify-backend`.
Do not revert unrelated user changes already present in the worktree.
Use TDD for every production-code change: write or update the failing test first, verify the failure, then implement the minimal fix.
Give each parallel worker a disjoint company-folder and test-file ownership set.
Reserve edits to `scraper/providers/customProviders.json` and `scraper/providers/companyAliases.json` for the controller to avoid merge conflicts.
Treat `indian_hiring_companies_1000.csv` as the coverage source of truth.

---

### Task 1: Fix Coverage Header Handling And Wire Existing Unregistered Scrapers

**Files:**
- Modify: `scraper/providers/companyCoverage.js`
- Modify: `scraper/tests/companyCoverage.test.js`
- Modify: `scraper/providers/customProviders.json`
- Modify: `scraper/providers/companyAliases.json`
- Test: `scraper/tests/GatiCatalog.test.js`

**Interfaces:**
- Consumes: `generateCompanyCoverageReport({ csvText, catalog, aliasMap })`
- Produces: one-column CSV header handling, plus live catalog entries for `gati`, `gentari`, and `giva`

- [ ] **Step 1: Write the failing test**

```js
test('generateCompanyCoverageReport ignores a one-column company_name header row', () => {
  const report = generateCompanyCoverageReport({
    csvText: `company_name
Gati
`,
    catalog: [{ source: 'gati', companyName: 'Gati', companyCareerPage: 'https://www.gati.com/' }],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scraper/tests/companyCoverage.test.js`
Expected: FAIL because the one-column `company_name` header is currently counted as an unmatched company.

- [ ] **Step 3: Write minimal implementation**

```js
const hasSingleColumnHeader =
  firstColumn === 'company_name'
  && !secondColumn
const dataLines = hasStructuredHeader || hasSingleColumnHeader ? remainingLines : lines
```

Add catalog entries for the already-implemented company folders using the existing `modulePath`, `companyCareerPage`, and verified metadata pattern already used in `customProviders.json`, plus aliases:

```json
{
  "source": "gati",
  "companyName": "Gati",
  "adapter": "script",
  "modulePath": "../gati/script.js"
}
```

```json
{
  "Gati": "gati",
  "Gentari": "gentari",
  "GIVA": "giva"
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scraper/tests/companyCoverage.test.js scraper/tests/GatiCatalog.test.js scraper/tests/GatiScript.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scraper/providers/companyCoverage.js scraper/tests/companyCoverage.test.js scraper/providers/customProviders.json scraper/providers/companyAliases.json scraper/tests/GatiCatalog.test.js
git commit -m "feat: wire existing g-series scrapers into coverage"
```

### Task 2: Parallel Worker Company Batches

**Files:**
- Create: `scraper/<source>/catalog.js`
- Create: `scraper/<source>/script.js`
- Create: `scraper/tests/<Company>Catalog.test.js`
- Create: `scraper/tests/<Company>Script.test.js`
- Create: `artifacts/scraper-batches/<batch-name>.md`

**Interfaces:**
- Consumes: existing scraper patterns in `scraper/*/script.js` and `scraper/tests/*`
- Produces: company-local scraper implementation plus a short batch report listing the exact `customProviders.json` object and alias entries needed for integration

- [ ] **Step 1: Write the failing tests**

```js
test('Company X catalog exposes the verified provider metadata', async () => {
  const { COMPANY_X_CATALOG } = await import('../companyx/catalog.js')
  assert.equal(COMPANY_X_CATALOG.source, 'companyx')
})
```

```js
test('Company X scraper returns the verified public jobs or a verified empty sentinel result', async () => {
  const module = await import('../companyx/script.js')
  const jobs = await module.run({ /* mocked fetch hooks */ })
  assert.ok(Array.isArray(jobs))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scraper/tests/CompanyXCatalog.test.js scraper/tests/CompanyXScript.test.js`
Expected: FAIL because the company module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export const COMPANY_X_CATALOG = {
  source: 'companyx',
  companyName: 'Company X',
  adapter: 'script',
  modulePath: '../companyx/script.js',
}
```

```js
export const createCompanyXScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    // Verify the official surface, then either extract current jobs
    // or return [] when the public first-party surface is verified empty.
  },
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scraper/tests/CompanyXCatalog.test.js scraper/tests/CompanyXScript.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scraper/companyx scraper/tests/CompanyXCatalog.test.js scraper/tests/CompanyXScript.test.js artifacts/scraper-batches/batch-x.md
git commit -m "feat: add company x scraper"
```

### Task 3: Controller Integration And Coverage Verification

**Files:**
- Modify: `scraper/providers/customProviders.json`
- Modify: `scraper/providers/companyAliases.json`
- Modify: `scraper/tests/companyCoverage.test.js`

**Interfaces:**
- Consumes: batch reports from Task 2
- Produces: shared catalog wiring and updated coverage numbers

- [ ] **Step 1: Integrate batch reports into shared catalog files**

```json
{
  "source": "companyx",
  "companyName": "Company X",
  "adapter": "script",
  "modulePath": "../companyx/script.js",
  "companyCareerPage": "https://example.com/careers"
}
```

- [ ] **Step 2: Run coverage report**

Run: `node scripts/reportCompanyCoverage.js ..\\indian_hiring_companies_1000.csv`
Expected: lower `unmatchedCount` than the pre-change baseline of `459`.

- [ ] **Step 3: Run focused regressions**

Run: `node --test scraper/tests/companyCoverage.test.js scraper/tests/GatiCatalog.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add scraper/providers/customProviders.json scraper/providers/companyAliases.json scraper/tests/companyCoverage.test.js
git commit -m "feat: integrate scraper coverage batch updates"
```
