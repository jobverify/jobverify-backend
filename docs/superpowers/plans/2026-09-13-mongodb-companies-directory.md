# MongoDB Companies Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add a searchable, paginated Companies directory and company detail pages sourced only from currently visible MongoDB Job documents.

**Architecture:** A backend service aggregates public Job records by companyKey, and a dedicated public controller/router exposes list and detail endpoints. React pages use local request state, URL-backed search/pagination, shared navigation targets, focused components, and existing Jobverify tokens.

**Tech Stack:** Node.js 24, Express 5, Mongoose 8, express-validator, Node test runner, React 19, React Router 7, Vite 7, Lucide React, Playwright.

**Spec:** jobverify-backend/docs/superpowers/specs/2026-09-13-mongodb-companies-directory-design.md

## Global Constraints

- Runtime company data comes only from MongoDB Job documents; never read company_coverage_report.json.
- Include only jobs accepted by applyPublicJobVisibility({ status: "active" }, siteSettings).
- Group on non-empty companyKey; do not expose hidden, expired, future-dated, closed, aggregate-signal, or otherwise non-public jobs.
- Default list size is 24 and the API maximum is 48.
- Search is trimmed, limited to 100 characters, and regex-escaped.
- Return explicit public-field allowlists; never expose descriptions, scraper paths, operational errors, or raw Job documents.
- Preserve unrelated dirty-worktree changes and stage only feature files.
- Follow the current purple/gold tokens, responsive container rules, and focus treatment.
- Use code-native initials; do not request third-party logos.

---

### Task 1: Company aggregation service

**Files:**
- Create: jobverify-backend/src/services/companyDirectoryService.js
- Create: jobverify-backend/test/companyDirectoryService.test.js

**Interfaces:**
- Consumes: Job.aggregate, Job.find, applyPublicJobVisibility.
- Produces: listPublicCompanies({ query, page, limit, siteSettings }).
- Produces: getPublicCompanyByKey({ companyKey, siteSettings }).
- Produces: DEFAULT_COMPANY_PAGE_SIZE = 24, MAX_COMPANY_PAGE_SIZE = 48, RECENT_COMPANY_JOB_LIMIT = 6.

- [ ] **Step 1: Write failing service tests**

Test the real pipeline construction and response normalization at the Mongoose boundary:

~~~js
test("listPublicCompanies normalizes a grouped public response", async () => {
  Job.aggregate = (pipeline) => ({
    exec: async () => [{
      companies: [{
        key: "acme labs",
        names: ["Acme Labs"],
        domains: [null, "acme.test"],
        careerPages: ["https://acme.test/careers"],
        atsPlatforms: ["workday", null],
        activeJobCount: 2,
        locations: ["Bengaluru", null],
        latestPostedAt: new Date("2026-09-13T00:00:00.000Z"),
      }],
      total: [{ count: 1 }],
    }],
  });

  const result = await listPublicCompanies({ page: 1, limit: 24 });
  assert.equal(result.companies[0].name, "Acme Labs");
  assert.deepEqual(result.companies[0].atsPlatforms, ["workday"]);
  assert.equal(result.pagination.total, 1);
});
~~~

Assert the captured first match includes status active, isPublicIndia true, non-empty companyKey, lifecycle visibility, and a literal-safe regex for Acme (India)+. For detail, stub the complete Job.find().select().sort().limit().lean().exec() chain and assert exact-key matching, six-role limit, id conversion, allowlisted fields, and null when no company exists.

- [ ] **Step 2: Run the service test and verify RED**

~~~powershell
node --test test/companyDirectoryService.test.js
~~~

Expected: FAIL because the service module does not exist.

- [ ] **Step 3: Implement the minimal service**

~~~js
export const DEFAULT_COMPANY_PAGE_SIZE = 24;
export const MAX_COMPANY_PAGE_SIZE = 48;
export const RECENT_COMPANY_JOB_LIMIT = 6;

export async function listPublicCompanies({
  query = "",
  page = 1,
  limit = DEFAULT_COMPANY_PAGE_SIZE,
  siteSettings = {},
} = {}) {
  // One aggregation: public match, group, lowercase sort key, facet, normalize.
}

export async function getPublicCompanyByKey({
  companyKey,
  siteSettings = {},
} = {}) {
  // Exact public aggregate plus six strictly projected recent jobs.
}
~~~

Use one facet for rows and grouped-company count. Accumulate optional fields as arrays, remove null/blank values after aggregation, and sort on lowercase name then key. Limit recent job selection to title, company, city, locations, jobType, primaryRoleDomain, workArrangement, postedAt, and sortDate.

- [ ] **Step 4: Run the service test and verify GREEN**

~~~powershell
node --test test/companyDirectoryService.test.js
~~~

Expected: PASS without warnings.

- [ ] **Step 5: Commit the isolated slice**

~~~powershell
git add -- src/services/companyDirectoryService.js test/companyDirectoryService.test.js
git commit -m "feat: aggregate public company directory"
~~~

---

### Task 2: Public Companies API

**Files:**
- Create: jobverify-backend/src/controllers/companyController.js
- Create: jobverify-backend/src/routes/companyRoutes.js
- Create: jobverify-backend/test/companyController.test.js
- Create: jobverify-backend/test/companyRoutes.test.js
- Modify: jobverify-backend/src/validation/requestValidators.js
- Modify: jobverify-backend/src/app.js

**Interfaces:**
- Consumes: Task 1 service functions.
- Produces: GET /api/companies?q=&page=&limit=.
- Produces: GET /api/companies/:companyKey.
- Produces: companyDirectoryQueryValidation and companyKeyParamValidation.

- [ ] **Step 1: Write failing controller, route, and validation tests**

Assert 200 envelopes contain code, success, and data; missing details return exactly:

~~~js
assert.deepEqual(res.body, {
  code: 404,
  success: false,
  message: "Company not found",
});
~~~

Import the real router and assert / maps to getCompanies and /:companyKey maps to getCompanyByKey. Send limit=49, page=0, a 101-character q, and an overlong companyKey through the real validation chain and expect the existing 400 validation envelope.

- [ ] **Step 2: Run API tests and verify RED**

~~~powershell
node --test test/companyController.test.js test/companyRoutes.test.js
~~~

Expected: FAIL because the controller/router exports are absent.

- [ ] **Step 3: Implement validators and routes**

~~~js
export const companyDirectoryQueryValidation = [
  query("q").optional().customSanitizer(trimIfString).isLength({ max: 100 })
    .withMessage("Company search must be 100 characters or fewer."),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be at least 1."),
  query("limit").optional().isInt({ min: 1, max: 48 })
    .withMessage("Limit must be between 1 and 48."),
];

export const companyKeyParamValidation = [
  boundedStringRule(param("companyKey"), "Company key", 100),
];
~~~

Parse sanitized values, set Cache-Control to no-store, pass req.siteSettings to the service, and return safe 500 messages. Apply loadSiteSettings and validateRequest in companyRoutes, then mount app.use("/api/companies", companyRoutes) before the API catch-all.

- [ ] **Step 4: Run focused and adjacent backend tests**

~~~powershell
node --test test/companyDirectoryService.test.js test/companyController.test.js test/companyRoutes.test.js test/app.test.js test/rateLimitConfig.test.js
~~~

Expected: PASS.

- [ ] **Step 5: Commit the isolated API slice**

~~~powershell
git add -- src/controllers/companyController.js src/routes/companyRoutes.js src/validation/requestValidators.js src/app.js test/companyController.test.js test/companyRoutes.test.js
git commit -m "feat: expose public companies API"
~~~

---

### Task 3: Frontend data contract and URL state

**Files:**
- Create: jobverify-frontend/src/features/companies/companyApi.js
- Create: jobverify-frontend/src/features/companies/companyDirectory.js
- Create: jobverify-frontend/src/features/companies/companyDirectory.test.js

**Interfaces:**
- Consumes: apiFetch, apiUrl, readApiResponse, apiErrorMessage, serializeJobFiltersToSearchParams.
- Produces: fetchCompanies({ query, page, limit, signal }) and fetchCompany(companyKey, { signal }).
- Produces: parseCompanyDirectorySearch, serializeCompanyDirectorySearch, getCompanyInitials, buildCompanyJobsPath, formatCompanyDate.

- [ ] **Step 1: Write failing contract tests**

~~~js
test("company directory URL state is canonical", () => {
  assert.deepEqual(parseCompanyDirectorySearch("?q=%20Acme%20&page=3"), {
    query: "Acme",
    page: 3,
  });
  assert.equal(
    serializeCompanyDirectorySearch({ query: "Acme", page: 1 }).toString(),
    "q=Acme",
  );
});

test("company jobs path uses the existing filter contract", () => {
  assert.equal(
    buildCompanyJobsPath("A&B Global"),
    "/jobs?company=A%26B+Global&limit=12",
  );
});
~~~

Also cover punctuation and one-word initials, invalid dates returning null, list/detail URL encoding, abort signals, and safe API errors.

- [ ] **Step 2: Run helper tests and verify RED**

~~~powershell
node --test src/features/companies/companyDirectory.test.js
~~~

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement helpers and API functions**

~~~js
export function parseCompanyDirectorySearch(searchParams) { /* normalize q and page */ }
export function serializeCompanyDirectorySearch({ query = "", page = 1 }) { /* URLSearchParams */ }
export function getCompanyInitials(name) { /* maximum two initials */ }
export function buildCompanyJobsPath(name) { /* existing job filter serializer */ }
export function formatCompanyDate(value) { /* en-IN output or null */ }

export async function fetchCompanies({ query = "", page = 1, limit = 24, signal } = {}) { /* GET */ }
export async function fetchCompany(companyKey, { signal } = {}) { /* GET */ }
~~~

For non-OK responses throw Error(apiErrorMessage(data, fallback)); attach response.status to detail errors so 404 is distinguishable.

- [ ] **Step 4: Run helper tests and verify GREEN**

~~~powershell
node --test src/features/companies/companyDirectory.test.js
~~~

Expected: PASS.

- [ ] **Step 5: Commit the isolated data slice**

~~~powershell
git add -- src/features/companies/companyApi.js src/features/companies/companyDirectory.js src/features/companies/companyDirectory.test.js
git commit -m "feat: add company directory data contract"
~~~

---

### Task 4: Companies navigation and routes

**Files:**
- Modify: jobverify-frontend/src/components/Navbar/navigationTargets.js
- Modify: jobverify-frontend/src/components/Navbar/navigationTargets.test.js
- Modify: jobverify-frontend/src/components/Navbar/Navbar.jsx
- Modify: jobverify-frontend/src/App.jsx
- Create: jobverify-frontend/src/App.companiesRoutes.test.js

**Interfaces:**
- Produces navigation target { to: "/companies", label: "Companies", activePath: "/companies" }.
- Produces isPrimaryNavigationActive(pathname, link, { isPlansPreview }).
- Produces /companies and /companies/:companyKey routes.

- [ ] **Step 1: Write failing navigation and route tests**

Add Companies between Jobs and Analytics in every expected navigation array. Assert /companies/acme activates Companies, /jobs/123 activates Jobs, and neither activates the other. Assert App source contains lazy imports, both paths, /companies metadata, and PUBLIC_INDEXABLE_ROUTES membership.

- [ ] **Step 2: Run tests and verify RED**

~~~powershell
node --test src/components/Navbar/navigationTargets.test.js src/App.companiesRoutes.test.js
~~~

Expected: FAIL because Companies is not registered.

- [ ] **Step 3: Implement navigation and routes**

Add Building2Icon to Navbar and delegate active matching to the tested helper. Add:

~~~jsx
const CompaniesPage = safeLazy(() => import("./pages/Companies/CompaniesPage"));
const CompanyDetailPage = safeLazy(() => import("./pages/Companies/CompanyDetailPage"));

{ path: "/companies", element: withSuspense(<CompaniesPage />) },
{ path: "/companies/:companyKey", element: withSuspense(<CompanyDetailPage />) },
~~~

Use Explore Companies Hiring in India | Jobverify plus a concise directory description. Nested company routes receive safe detail metadata before the component sets the loaded company title.

- [ ] **Step 4: Run navigation and route tests**

~~~powershell
node --test src/components/Navbar/navigationTargets.test.js src/components/Navbar/Navbar.test.js src/App.companiesRoutes.test.js src/App.authRoutes.test.js src/App.layout.test.js
~~~

Expected: PASS.

- [ ] **Step 5: Commit the isolated navigation slice**

~~~powershell
git add -- src/components/Navbar/navigationTargets.js src/components/Navbar/navigationTargets.test.js src/components/Navbar/Navbar.jsx src/App.jsx src/App.companiesRoutes.test.js
git commit -m "feat: add companies navigation and routes"
~~~

---

### Task 5: Searchable directory page

**Files:**
- Create: jobverify-frontend/src/pages/Companies/CompanyCard.jsx
- Create: jobverify-frontend/src/pages/Companies/CompanyPagination.jsx
- Create: jobverify-frontend/src/pages/Companies/CompaniesPage.jsx
- Create: jobverify-frontend/src/pages/Companies/CompaniesPage.css
- Create: jobverify-frontend/src/pages/Companies/CompaniesPage.test.js

**Interfaces:**
- Consumes: Task 3 API/helpers and React Router.
- Produces: CompaniesPage, CompanyCard, and CompanyPagination.

- [ ] **Step 1: Write failing structural tests**

Assert an h1 with Explore companies hiring now., labelled searchbox, aria-busy results, skeletons, retry, clear-search, exact detail links, three-column desktop CSS, two-column 960px CSS, one-column 640px CSS, and focus-visible rules.

- [ ] **Step 2: Run the page test and verify RED**

~~~powershell
node --test src/pages/Companies/CompaniesPage.test.js
~~~

Expected: FAIL because the page files do not exist.

- [ ] **Step 3: Implement the directory**

Fetch from URL state and abort obsolete requests:

~~~jsx
useEffect(() => {
  const controller = new AbortController();
  setState((current) => ({ ...current, loading: true, error: null }));
  fetchCompanies({ query, page, signal: controller.signal })
    .then((data) => setState({ data, loading: false, error: null }))
    .catch((error) => {
      if (error.name !== "AbortError") {
        setState((current) => ({ ...current, loading: false, error: error.message }));
      }
    });
  return () => controller.abort();
}, [page, query, retryKey]);
~~~

Synchronize a controlled search draft with URL changes, debounce URL updates by 300ms, reset page to 1 when q changes, preserve results during subsequent requests, and format counts with Intl.NumberFormat("en-IN"). Implement initial marks, cards, skeletons, empty/error surfaces, and pagination with existing tokens and Lucide icons.

- [ ] **Step 4: Run directory and adjacent tests**

~~~powershell
node --test src/pages/Companies/CompaniesPage.test.js src/features/companies/companyDirectory.test.js src/components/Navbar/navigationTargets.test.js
~~~

Expected: PASS.

- [ ] **Step 5: Commit the directory slice**

~~~powershell
git add -- src/pages/Companies/CompanyCard.jsx src/pages/Companies/CompanyPagination.jsx src/pages/Companies/CompaniesPage.jsx src/pages/Companies/CompaniesPage.css src/pages/Companies/CompaniesPage.test.js
git commit -m "feat: build searchable companies directory"
~~~

---

### Task 6: Company detail page

**Files:**
- Create: jobverify-frontend/src/pages/Companies/CompanyDetailPage.jsx
- Create: jobverify-frontend/src/pages/Companies/CompanyDetailPage.test.js
- Modify: jobverify-frontend/src/pages/Companies/CompaniesPage.css

**Interfaces:**
- Consumes: fetchCompany, getCompanyInitials, buildCompanyJobsPath, formatCompanyDate, useParams.
- Produces: CompanyDetailPage.

- [ ] **Step 1: Write failing detail tests**

Assert Back to companies, Visit careers page, View all jobs, Hiring snapshot, Current openings, Company not found, external-link safety, /jobs/{id} role links, accessible loading/retry states, and absence of description, modulePath, and lastError.

- [ ] **Step 2: Run the detail test and verify RED**

~~~powershell
node --test src/pages/Companies/CompanyDetailPage.test.js
~~~

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the detail page**

Abort requests on key changes, distinguish error.status === 404, and update document.title after load. Build only non-empty snapshot groups:

~~~jsx
const snapshotGroups = [
  ["Locations", company.locations],
  ["Job types", company.jobTypes],
  ["Role domains", company.roleDomains],
  ["Work arrangements", company.workArrangements],
  ["Hiring platform", company.atsPlatforms],
].filter(([, values]) => values?.length);
~~~

Show one company header, an HTTP(S)-only careers action, the filtered Jobs action, one open snapshot section, and up to six role rows linked to /jobs/{id}.

- [ ] **Step 4: Run complete company unit tests**

~~~powershell
node --test src/pages/Companies/CompanyDetailPage.test.js src/pages/Companies/CompaniesPage.test.js src/features/companies/companyDirectory.test.js src/App.companiesRoutes.test.js
~~~

Expected: PASS.

- [ ] **Step 5: Commit the detail slice**

~~~powershell
git add -- src/pages/Companies/CompanyDetailPage.jsx src/pages/Companies/CompanyDetailPage.test.js src/pages/Companies/CompaniesPage.css
git commit -m "feat: add company detail pages"
~~~

---

### Task 7: Browser coverage and verification

**Files:**
- Create: jobverify-frontend/tests/e2e/companies-directory.spec.js
- Modify only after an observed mismatch: company feature files from Tasks 3-6.

**Interfaces:**
- Consumes: complete API and UI.
- Produces: desktop/mobile company-directory regression coverage.

- [ ] **Step 1: Write a failing mocked-API Playwright journey**

Intercept /api/companies list/detail calls. Verify the directory heading, a debounced Acme search in the URL, card navigation, company detail, recent role navigation, and a View all jobs href containing company=Acme+Labs&limit=12. Add 390x844 mobile navigation, empty, retry, and 404 cases.

- [ ] **Step 2: Run E2E and verify RED**

~~~powershell
npx playwright test tests/e2e/companies-directory.spec.js
~~~

Expected: FAIL until the full UI is available through the test server.

- [ ] **Step 3: Run local browser QA and repair observed mismatches**

Start the normal backend and frontend dev sessions. Exercise directory load, search, pagination, card detail, recent role, careers presence, and filtered Jobs navigation at 1216x595 and 390x844.

- [ ] **Step 4: Run full verification**

From jobverify-backend:

~~~powershell
npm run lint
node --test test/companyDirectoryService.test.js test/companyController.test.js test/companyRoutes.test.js test/app.test.js test/rateLimitConfig.test.js
~~~

From jobverify-frontend:

~~~powershell
npm run lint
npm run test:unit
npm run build
npx playwright test tests/e2e/companies-directory.spec.js
~~~

Expected: all commands exit 0 with zero failures.

- [ ] **Step 5: Capture and inspect screenshots**

Capture directory and detail at 1216x595 and 390x844. Inspect with view_image. Compare navigation/copy, composition, card density, typography, palette, icons, focus/hover behavior, and responsive wrapping. Fix material mismatches and rerun affected checks.

- [ ] **Step 6: Commit E2E coverage only**

~~~powershell
git add -- tests/e2e/companies-directory.spec.js
git commit -m "test: cover companies directory journey"
~~~
