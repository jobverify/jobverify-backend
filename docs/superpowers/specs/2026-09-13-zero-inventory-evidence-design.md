# Zero-Inventory Evidence Design

Date: 2026-09-13

## Problem

The scraper pipeline currently treats any successfully returned array as a successful source run. An empty array can mean several materially different things: a verified first-party inventory is empty, a configured board is wrong, a parser no longer matches, a third-party directory has no matching records, or a placeholder deliberately returned `[]` without making a request.

The 2026-09-12 dry run exposed this ambiguity. Of 3,457 successful sources with zero India jobs, 3,409 returned no raw records, but 1,913 of those used static or non-live zero implementations. The run therefore measured scraper output, not actual vacancy inventories.

## Goals

- Never interpret an unverified empty array as proof that a company has no vacancies.
- Keep existing active database jobs when a source returns an unverified zero.
- Prevent placeholders and discovery-only directories from counting as verified company coverage.
- Require first-party inventory evidence before an empty result can expire existing jobs.
- Make summary output distinguish verified empty inventories, non-India-only inventories, unverified zeros, coverage gaps, and blocked sources.
- Repair the confirmed Autodesk board configuration error.
- Provide a repeatable migration path for Air India, Decathlon India, and the remaining placeholder/static sources.

## Non-goals

- Building 1,787 company-specific parsers in one mechanical change.
- Claiming a company has zero jobs based only on an old catalog note.
- Treating Himalayas or Wellfound as authoritative company-wide vacancy inventories.
- Changing job publishability rules for titles, locations, closing dates, or application URLs.

## Chosen approach

Use a centralized inventory-evidence contract attached to the returned jobs array with a non-enumerable symbol. This matches the existing Workday authoritative-empty mechanism while allowing all adapters to describe what they actually established.

Alternative approaches considered:

1. Keep plain arrays and infer meaning from provider metadata. This is minimal, but it cannot prove what happened during a particular run and can silently trust stale metadata.
2. Replace every scraper return value with an object such as `{ jobs, evidence }`. This is the cleanest long-term API but would require changing thousands of scrapers at once.
3. Attach structured evidence to arrays and normalize it at the provider/runner boundary. This is the selected approach because it is backward-compatible, centrally enforceable, and incrementally migratable.

## Inventory-evidence contract

Create `scraper-support/utils/inventoryEvidence.js` with a shared symbol and helpers.

Evidence has this shape:

```js
{
  status: 'verified-empty' | 'complete-inventory' | 'discovery-only' | 'coverage-gap' | 'unverified',
  surface: 'https://...',
  firstParty: true | false,
  listingComplete: true | false,
  pagesFetched: 0,
  reportedTotal: null,
  indiaFacetCount: null,
  verifiedAt: 'ISO timestamp',
  reason: 'short machine-readable explanation',
}
```

Rules:

- `verified-empty` requires `firstParty === true`, `listingComplete === true`, a valid HTTP(S) surface, and evidence from the current run.
- `complete-inventory` means the current run enumerated a complete first-party inventory. If raw records exist but the India filter removes all of them, the runner classifies the result as `fetched-zero`.
- `discovery-only` is used by Himalayas and Wellfound. It can produce jobs, but a zero is never authoritative.
- `coverage-gap` represents placeholders, static snapshots, and sources without a current public inventory implementation.
- Missing or malformed evidence becomes `unverified`.

## Provider policy

Hydration assigns a `zeroResultPolicy` without editing every provider module:

- `coverage-gap` for `workbook-exact-name-sentinel`, fail-closed sentinel metadata, verified-empty snapshots that do not fetch during the current run, and other explicitly static backfills.
- `discovery-only` for Himalayas and Wellfound adapters.
- `evidence-required` for Workday, API portals, and company scripts.

When a coverage-gap provider returns zero, the runner records a typed coverage result rather than a successful zero. Existing sentinel modules remain backward compatible, but their empty arrays no longer inflate successful-source or verified-coverage counts.

## Workday safety gate

The Workday engine must stop marking every empty first page authoritative. A Workday empty becomes `verified-empty` only when all of these are true:

- The configured listing endpoint belongs to the expected Workday tenant and board.
- The current request used the configured India country facet.
- The response shape is valid and contains a numeric total.
- The selected India facet, when supplied by Workday, does not contradict the result.
- The current response reports zero and returns no postings.
- The provider is explicitly marked `boardIdentityVerified: true`.

Providers must declare `boardIdentityVerified: true` before Workday may emit authoritative empty evidence. Until migrated, a Workday zero remains `unverified`, preventing a wrong but valid board such as Autodesk's university board from expiring jobs.

Autodesk's `baseUrl` changes from `https://autodesk.wd1.myworkdayjobs.com/en-US/uni` to `https://autodesk.wd1.myworkdayjobs.com/en-US/Ext`, matching its declared careers page.

## Runner behavior

The runner normalizes every result into one of these zero outcomes:

- `verified-empty`: authoritative first-party zero.
- `fetched-zero`: complete first-party raw inventory was fetched, but no India jobs survived location filtering.
- `unverified-zero`: scraper returned zero without sufficient evidence.
- `coverage-gap`: provider is a placeholder/static snapshot.
- `blocked-zero`: a discovery-only or access-blocked surface cannot establish inventory state.

Coverage gaps remain completed for checkpoint/resume purposes but use `success: false`, `softFailure: true`, and `failureKind: 'coverage_gap'`. They do not count as scraper failures that abort a batch.

Dry-run snapshots may still write an empty array for compatibility, but checkpoint metadata must retain the zero outcome and evidence.

## Persistence behavior

Only `verified-empty` may set `authoritativeEmpty: true`. All other zero outcomes preserve active jobs and skip lifecycle misses. This retains the existing defensive behavior in `saveToDB.js` and removes Workday's over-broad authorization.

## Reporting

The final summary will report mutually exclusive counts:

- Sources with India jobs.
- Verified empty first-party inventories.
- Complete inventories with zero India jobs.
- Unverified zero results.
- Coverage gaps.
- Discovery/access-blocked zero results.

`Successful` means a valid inventory operation completed, not merely that a function returned an array. Coverage gaps appear under a separate `Coverage` status and do not inflate successful-source rate.

## Provider migrations

The systemic change lands before source-specific migrations.

1. Correct Autodesk and add a captured Workday fixture regression test.
2. Replace Air India's sentinel with a parser for its official current-openings surface and category links.
3. Replace Decathlon India's sentinel with a parser for its official job-offer feed/pages.
4. Export the remaining coverage-gap sources as a remediation manifest ordered by workbook rank and evidence freshness.
5. Migrate live company/API scripts to attach `complete-inventory` or `verified-empty` evidence only after validating response identity, schema, and completeness.

Air India and Decathlon migrations must fail closed with an error when their official surface changes; they must never silently return an authoritative empty array after parser drift.

## Testing

Tests follow red-green-refactor and cover:

- Evidence validation rejects malformed or third-party authoritative-empty claims.
- A sentinel zero becomes a non-aborting coverage gap.
- A discovery-only directory zero becomes blocked/unverified, never verified empty.
- A zero without evidence preserves existing jobs.
- A verified empty first-party inventory authorizes lifecycle processing.
- A Workday zero without `boardIdentityVerified: true` remains unverified.
- A verified Workday board with a valid zero response becomes verified empty.
- Autodesk uses the `Ext` board and a fixture produces India jobs.
- Final summary categories are mutually exclusive and sum to processed sources.
- Air India and Decathlon fixtures emit current official India jobs and fail on contract drift.

Focused tests run first. The scraper-support suite and syntax lint run after each independently testable phase. A full network dry run is the final operational verification and is not used as a deterministic unit test.

## Rollout and success criteria

The change is safe to deploy when:

- No unverified zero can set `authoritativeEmpty: true`.
- Placeholder zeros no longer count as successful or verified coverage.
- Autodesk returns India jobs from the `Ext` board fixture and live verification.
- Air India and Decathlon no longer use fail-closed sentinel modules.
- Directory-adapter zeros are explicitly discovery-only.
- Summary zero categories are exhaustive and mutually exclusive.
- Focused, scraper-support, and lint verification pass.
- A new dry run records evidence or an explicit non-authoritative outcome for every zero result.
