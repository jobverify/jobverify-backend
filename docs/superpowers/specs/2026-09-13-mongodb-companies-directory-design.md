# MongoDB Companies Directory Design

**Date:** 2026-09-13

## Purpose

Add a public Companies navigation item, a searchable and paginated company directory, and a dedicated detail page for every company represented by a currently active public India job in MongoDB.

The user explicitly chose MongoDB `Job` documents as the only runtime data source. The public feature will not read `company_coverage_report.json`, create a separate company collection, or display coverage-only companies that have no current public job document.

## Scope and Definitions

A company is eligible for the directory when at least one `Job` document satisfies both conditions:

- `status` is `active`.
- `isPublicIndia` is `true`.

Eligible jobs are grouped by their existing `companyKey`. Duplicate job rows and multiple openings for the same `companyKey` produce one company. A company disappears from the directory when it no longer has any eligible jobs.

The feature includes:

- A `Companies` item in public desktop and mobile navigation.
- A searchable, URL-backed, paginated `/companies` page.
- One `/companies/:companyKey` detail page per eligible company.
- A public read API backed directly by MongoDB.
- Links from a company detail page to its official careers page when available and to the existing Jobs page with the company filter applied.

The feature excludes:

- Importing or reading `company_coverage_report.json` at runtime.
- Creating or synchronizing a new company collection.
- Exposing hidden or expired jobs.
- Exposing scraper implementation metadata, local paths, job descriptions, or operational failure details.
- Company logos or third-party logo lookup.

## Backend Architecture

### Public routes

Add a dedicated public router mounted at `/api/companies`.

#### `GET /api/companies`

Supported query parameters:

- `q`: optional search text, trimmed and limited to 100 characters.
- `page`: positive integer, default `1`.
- `limit`: positive integer, default `24`, maximum `48`.

The response shape is:

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "key": "example-company",
        "name": "Example Company",
        "domain": "example.com",
        "careerPage": "https://example.com/careers",
        "atsPlatforms": ["workday"],
        "activeJobCount": 12,
        "locations": ["Bengaluru", "Hyderabad"],
        "latestPostedAt": "2026-09-13T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 24,
      "total": 1287,
      "totalPages": 54
    },
    "query": "example"
  }
}
```

The aggregation will:

1. Match only eligible jobs.
2. If `q` is present, apply a safely escaped, case-insensitive match to public company identity fields such as `company`, `companyKey`, and `companyDomain`.
3. Group jobs by `companyKey`.
4. Collect non-empty public metadata, count eligible jobs, and determine the latest posting date.
5. Sort companies by display name using a stable secondary sort on `companyKey`.
6. Use a facet to return the requested page and the exact grouped-company count from one consistent query.

If a stored optional value is missing, the corresponding response field is `null` or an empty array and the frontend omits that label. The API never substitutes invented company metadata.

#### `GET /api/companies/:companyKey`

The route parameter is URI-decoded, trimmed, bounded, and matched exactly against an eligible job's `companyKey`. It returns:

```json
{
  "success": true,
  "data": {
    "company": {
      "key": "example-company",
      "name": "Example Company",
      "domain": "example.com",
      "careerPage": "https://example.com/careers",
      "atsPlatforms": ["workday"],
      "activeJobCount": 12,
      "locations": ["Bengaluru", "Hyderabad"],
      "jobTypes": ["Full Time"],
      "roleDomains": ["Software Engineering"],
      "workArrangements": ["Hybrid"],
      "latestPostedAt": "2026-09-13T00:00:00.000Z"
    },
    "recentJobs": [
      {
        "id": "mongo-object-id",
        "title": "Software Engineer",
        "company": "Example Company",
        "city": "Bengaluru",
        "locations": ["Bengaluru"],
        "jobType": "Full Time",
        "roleDomain": "Software Engineering",
        "workArrangement": "Hybrid",
        "postedAt": "2026-09-13T00:00:00.000Z"
      }
    ]
  }
}
```

`recentJobs` contains at most six eligible jobs, ordered by the same current-job date semantics used by the Jobs experience. Only the listed summary fields are selected. An unknown or no-longer-eligible key returns `404` with the existing API error envelope.

### Query and security behavior

- Reuse the existing public-job location scope rather than duplicating the meaning of `isPublicIndia` in multiple places.
- Reuse the existing company-key normalization and public job date behavior where applicable.
- Escape all regular-expression search input and validate query and route lengths.
- Classify these GET endpoints as ordinary public read traffic under the existing API rate limits.
- Select and serialize only an allowlist of public fields.
- Keep current MongoDB indexes; the existing public company/date index supports the base match and grouping. No new index is required for the expected dataset size.

## Frontend Architecture

### Routing and metadata

Add lazy routes:

- `/companies` renders `CompaniesPage`.
- `/companies/:companyKey` renders `CompanyDetailPage`.

Add `/companies` to the public indexable route metadata with a company-directory title and description. The detail route initially uses safe company-detail metadata and updates its title after the company loads. No dynamic prerendering or sitemap expansion is part of this change.

### Navigation

Add `Companies` to the shared primary navigation target list so every desktop and mobile header that consumes it stays consistent. Use the existing Lucide building icon family and the same active, hover, focus, responsive-collapse, and mobile-sheet behavior as the other primary links.

The Companies link is active for both `/companies` and nested company detail paths. The Jobs link remains active only on `/jobs` paths.

### Data access and state

Use a small companies API module built on the existing `apiFetch`, `apiUrl`, and `readApiResponse` helpers. The pages keep their request state locally because no other screen needs a global companies cache.

The directory URL is the source of truth:

- `q` stores the trimmed search query.
- `page` stores non-default pages.
- Search changes reset the page to `1`.
- Browser back and forward navigation restores the corresponding search and page.

Search input is debounced for 300 milliseconds. Each request uses an `AbortController`, so a superseded query cannot overwrite newer results. Pagination remains visible when more than one page exists and scrolls the directory heading into view after a user changes pages, respecting reduced-motion preferences.

### Companies directory

The `/companies` page follows the existing Jobverify visual system from the supplied Jobs screenshot and current design tokens. It contains:

- A compact page introduction with the title `Explore companies hiring now.` and supporting text that makes the live, India-focused scope clear.
- A prominent search control labelled `Search companies`.
- A result summary showing the exact number of matching companies.
- A responsive grid with three columns on desktop, two on tablet, and one on mobile.
- Twenty-four company cards per page by default.

Each card is a semantic article with:

- A code-native initial mark derived from the company name; no external logo request.
- Company name.
- Domain when available.
- Active job count.
- Up to two locations plus an overflow count.
- Hiring-platform label when available.
- A clear `View company` link to the detail route.

Cards reuse the application's surface, border, radius, shadow, typography, accent, focus, and theme tokens. They do not introduce a separate visual language or rasterized UI.

### Company detail

The `/companies/:companyKey` page contains:

- A `Back to companies` link that preserves normal browser history behavior.
- The same initial mark, company name, domain, and active-opening count.
- `Visit careers page` when a valid careers URL exists.
- A `View all jobs` action linking to `/jobs` with the exact company filter serialized using the existing job-filter URL contract.
- A hiring snapshot for locations, job types, role domains, work arrangements, ATS platforms, and latest posting date. Empty categories are omitted.
- Up to six recent-role rows linking to existing Job detail routes.

The layout uses an open page structure with one primary company header, a compact hiring snapshot, and a role list. It avoids nesting every value in a separate decorative card.

## Loading, Empty, and Failure States

- The directory shows card skeletons during its initial request.
- Updating search or pagination preserves the current layout while marking results busy, avoiding page-height jumps.
- A search with no matches shows a focused empty state and a `Clear search` action.
- A failed list or detail request shows the returned safe message and a `Try again` action.
- A `404` detail response shows `Company not found` with a link back to `/companies`.
- Missing optional metadata never blocks either page.
- All interactive controls have visible keyboard focus, accessible names, and at least the existing minimum target size.

## Testing Strategy

### Backend

Write tests before implementation for:

- Grouping multiple eligible jobs into one company.
- Excluding hidden, expired, and non-public-India jobs.
- Case-insensitive escaped search.
- Stable alphabetical ordering and pagination metadata.
- Default and maximum pagination limits.
- Omitting non-allowlisted fields.
- Exact company detail lookup and the six-role cap.
- Detail `404` behavior.
- Route validation and public response envelopes.

### Frontend

Write tests before implementation for:

- `Companies` navigation targets and active-path behavior.
- Company API URL construction and response handling.
- Search and pagination URL parsing/serialization.
- Company-card and detail view-model formatting, including missing optional data.
- App route registration and metadata.
- The company-filtered Jobs URL.

Add browser coverage for:

- Loading `/companies`, searching, and moving between result pages.
- Opening a card and rendering its detail page.
- Following a recent role to its Job detail route.
- Following `View all jobs` with the expected company filter.
- Desktop and mobile navigation and layouts.
- Loading, empty, retry, and not-found states.

## Verification

Before handoff:

1. Run focused backend tests, then the backend API test suite and syntax lint.
2. Run focused frontend tests, then frontend lint, unit tests, and production build.
3. Run the backend and frontend locally and verify the complete directory-to-detail-to-filtered-jobs workflow in the browser.
4. Check the supplied desktop scale and a mobile viewport for navigation fit, card density, wrapping, focus states, empty states, and overflow.
5. Compare the rendered pages against the approved visual structure and the existing Jobs design system, recording and correcting material mismatches before completion.
