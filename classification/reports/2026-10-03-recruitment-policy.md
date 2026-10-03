# Recruitment policy and ABB validation

The user confirmed that category defaults always win when they conflict with an employer requirement. Policy `laya-jobs-v2` applies those defaults in the shared scraper classification stage and the experience filters. Employer text and employer numeric requirements remain separate from the public filter inference.

## User examples

These are regression examples, not measurements of learned model accuracy. The reference year is 2026.

| Advert evidence | Category | Filter years |
| --- | --- | --- |
| 2025 batch pass outs | Full-time Experienced | 1, inferred |
| 2026 graduates | Full-time Fresher | 0 |
| Recently completed bachelor's | Full-time Fresher | 0 |
| Recently completed master's | Full-time Fresher | 0 |
| Required current bachelor's studies | Intern | 0 |
| Required current master's studies | Intern | 0 |
| Actual intern title without stated years | Intern | 0 |
| Required minimum 4 work years | Full-time Experienced | 4-15 |
| Manager without stated years | Full-time Experienced | 1-15, inferred |
| Contract with required 3-5 work years | Contract | 3-5 |

An internship requiring two years still gets filter zero. A 2025 cohort explicitly allowing zero still gets filter one. Ordinary completed-degree qualifications do not override required positive work years; recently completed/current-year graduate eligibility does. Preferred studies/experience, mixed completed-or-pursuing pathways, duties coaching graduates or supervising interns, contract-management occupations, unrelated dates, and unfilled template qualifications cannot establish mandatory eligibility. Career-break years are excluded while actual work years in the same sentence remain usable. Required prior experience without a number gets an inferred positive range.

## Implementation and verification

- The current Asia/Kolkata reference year, source text, and pinned runtime/policy identity participate in the classification cache key.
- Every selected source job goes through the shared Node-to-Laya client. Uncalibrated model guesses stay diagnostic. Approved product defaults publish through `policy` mode, with `decisionSource: 'policy'`.
- `sourceExperienceRequired` and `classification.resolved.employerExperienceProfile` retain employer facts. `experienceBasis` and `experienceProfile.inferenceMethod` explain public filter inferences.
- Structured batch years enter model context only with `eligibleBatchesProvenance: 'source'`. The flag and values survive persistence and partial rescrapes.
- Temporary MongoDB tests verify API/query/alert-filter parity, Intern plus year-zero matching, previous-cohort overrides, stale-version fallback, and numeric employer zero preservation.
- 176 focused backend Node tests plus 24 source-description checks, 23 Python tests, and seven frontend card-label tests pass. A direct backend-to-card check renders Intern with `[0]` as `0 years`. Bare ATS year values now render with units, and source-marked ATS facts survive classification and rescraping.
- Syntax checks and scoped whitespace checks pass. The rest of the repository's unrelated dirty changes were preserved.

The base Laya weights remain unchanged and no job-specific head or evaluation release has been activated. Supplying better instructions and enforcing reviewed defaults is not evidence that the base model has learned better job classification. The provided training and evaluation tools remain available for later human-labelled domain adaptation.

## Live ABB run

ABB is the first configured scraper. The initial default scrape returned 205 jobs but stopped optional detail fetching after its normal 30-second budget, leaving many summaries. A second local capture allowed up to 600 seconds for detail fetching; all 205 jobs have verified detail pages. This setting was local to the capture and did not change scheduled scraper budgets.

The final run uses the pinned CPU checkpoint, four local CPU threads, the unchanged 60-second request deadline, and a temporary 14400-second local shared worker budget. It checkpoints every completed job and upserts eligible ABB results after classification, with alerts, description rewriting, and unrelated vacancy expiry disabled.

All 205 returned jobs were processed and updated in the connected MongoDB database. There were no inserts, deletions, filtered-out jobs, vacancy expiries, or alerts from this command. A subsequent read matched all 205 fingerprints and compared stored type/years against the current policy and the API's MongoDB public-type expression: no missing records, mismatches, or category/year invariant violations. Compared with the pre-run snapshot, 156 records changed category or filter years.

| Stored category | Jobs |
| --- | ---: |
| Full-time Experienced | 197 |
| Contract | 2 |
| Full-time Fresher | 1 |
| Unspecified | 5 |

All Experienced jobs have positive filter years within 1-15. Eighteen records use an inferred positive range because the role or required prior experience has no numeric requirement. Employer numeric facts remain in the resolved employer profile, separately from filter defaults. The five Unspecified rows are Buyer, Associate Project Engineer, ITI - Trainee, Sales Specialist, and the unfilled-template title `00`; no confident vacancy classification is claimed for them.

The first pass had 203 complete results, two incomplete results, four compatible cached results, zero model-budget skips, and zero accepted neural decisions. Persistence retried changed inputs and incomplete scans. Two records were still incomplete after saving; a targeted three-job recheck completed those and the fresher edge case. The final database read confirms all 205 stored classifications have complete native scans. Every raw model prediction remains diagnostic because the model has no validated job-specific head or calibration release.

The live run also exposed a display normalizer that inserted newlines into employer text, changed input hashes, and caused repeated inference. The original `sourceDescription` is now retained. All 205 captured ABB input hashes remain identical after display normalization. A directly eligible fresher with skills in “managing payment cycles” is no longer mistaken for a responsibility about managing graduates; the regression also protects a director mentoring existing team members. A final native recheck of that fresher job used the final runtime identity. Earlier captured probabilities retain their original runtime identities, and future rescrapes invalidate those caches correctly.

| Actual ABB vacancy | Previous stored filter | Final stored filter |
| --- | --- | --- |
| Head of Product Development | Experienced, no numeric years | Experienced, 1-15 inferred |
| Team Lead R&D & Engineering | Experienced, no numeric years | Experienced, 1-15 inferred |
| HR Operations Specialist - One Year Fixed Term Contract | Experienced, 2+ years | Contract, 2+ years |
| Accounting & Reporting Analyst accepting freshers with post-graduation | Experienced, 2-3 years | Fresher, 0 inferred; employer 2-3 range retained separately |

The [final stored-record verification](../../.cache/classification-runs/abb-after-verification-final.json) contains the limited before/after evidence. The [full run](../../.cache/classification-runs/abb-classified-applied-final.json), [targeted recheck](../../.cache/classification-runs/abb-targeted-recheck-applied.json), and [final fresher recheck](../../.cache/classification-runs/abb-fresher-final-applied.json) retain their separate stages; the first report's preview is not substituted for the final database read.

## Live American Chase comparison

Four current jobs were captured and run through the final pinned native worker locally. All four scans completed, with zero accepted neural decisions, timeouts, or budget skips. This comparison did not write American Chase jobs to MongoDB.

| Job | Evidence used by the old classifier | Old filter | Raw Laya experience choice | Final policy filter |
| --- | --- | --- | --- | --- |
| Network Administrator | Source `3-5`, Full Time | Experienced, 3-5 | Prior required, 57.37% | Experienced, 3-5 |
| Corporate Trainer Intern | Title `Intern`, source `0-1` | Internship, 0-1 | Prior required, 63.72% | Intern, 0 inferred |
| Project Coordinator | Source `Freshers`, Full Time | Fresher, 0 | Fresher eligible, 91.57% | Fresher, 0 |
| Associate System Engineer | Source `0`, Full Time | Fresher, 0 | Fresher eligible, 47.06% | Experienced, 1 inferred from the 2025 cohort |

The last result follows the user's rule for 2025 graduates in 2026; it does not assert one year of actual professional work. The intern's employment choice was correct at 99.97%, but its experience choice still asked for prior experience. On ABB, Laya guessed internship for Head of Product Development (56.11%) and for the eligible fresher accounting role (53.13%). These are concrete reasons to retain the reviewed policy guard and avoid claiming that Laya alone fixes the filter.

The [final four-job native report](../../.cache/classification-runs/americanchase-policy-final.json) includes the model decisions and final public fields. The worker was stopped after validation, freeing local CPU and memory. Its cached weights remain local for reuse.

## Scheduled rollout

The shared code supports all configured providers. Following the user's instruction to implement the rollout, the local scheduled workflow now defaults to `policy`, and model dependency/startup failures allow the reviewed defaults to continue publishing outside `enforce` mode. The shared model budget remains 1200 seconds, so a complete native scan for every scheduled job is not guaranteed; jobs beyond that budget still receive the approved policy defaults with model fallback recorded.

The [rollout record](../proposals/publish-recruitment-policy.md) shows the three applied workflow edits and the user's authorization. The request deadline remains 60 seconds. These edits are local; GitHub activation requires publishing the branch and deploying the backend API/schema changes first. No code has been pushed or deployed by this task, and no approval request is pending for these edits.
