# Completed local dry run and classification audit, 2026-10-03

The affected run finished at **22:00:47 IST** (`2026-10-03T16:30:47.368Z`) with supervisor exit code **0**. The final checkpoint contains **4670/4670 attempted sources**, **4607 successful sources**, **63 source failures**, and **40631 saved jobs**. Both the scraper PID 6468 and supervisor PID 12544 exited; the supervisor stopped its owned Laya worker. This was a local dry run with no application MongoDB writes or alerts.

## Why it looked stuck and took longer

The first ten sources fetched 603 jobs, then occupied all ten scraper slots while their batches waited on one serial CPU classifier. Even a five-job source waited behind other inference requests. Python forwards could outlive the HTTP timeout; waiting for the inference lock and retrying busy responses multiplied that delay. Dry-run classification lacked stage/progress logs. The [stall report](2026-10-03-local-scrape-stall.md) records the diagnosis, recovery and first fixes.

| Observation | Earlier run | Affected run |
| --- | ---: | ---: |
| Overall checkpoint wall time | 64.09 minutes | 120.48 minutes |
| Attempted sources | 4670 | 4670 |
| Saved jobs | 34813 | 40631 |
| Source failures | 231 | 63 |
| Alteryx, same five jobs | 5.63 seconds | 1171.85 seconds |
| Amadeus, same five jobs | 6.13 seconds | 1171.96 seconds |
| Allstate, same three jobs | 1.36 seconds | 1008.51 seconds |

These are different live upstream runs, and the affected run includes a graceful stop, code fixes and checkpoint resume. The earlier environment did not record `JOB_CLASSIFICATION_MODE`; its startup has no Laya bootstrap. This is not a controlled performance experiment or proof that all 56.39 added minutes are model compute. The recovery gap alone was about ten minutes, and this run obtained 5818 more jobs.

After the resumed worker's 20-minute budget expired, **1093 successful matched sources with the same nonzero job count** had a median total duration ratio of **1.051** against the earlier run. Their median classification stage was **0.1 seconds/source**, or **0.0071 seconds/job**. Public-page enrichment remained expensive for some providers: Cisco spent 192.6 seconds enriching 286 jobs, while classification took 5.3 seconds. Concurrent source-stage sums are not wall time.

The client now falls back during worker cooldown, does not retry busy responses repeatedly, stops making native requests once the shared budget is exhausted, retries initial health failures, and logs enrichment/classification/snapshot stages with classification heartbeats. The worker immediately reports busy, reports deadline overruns, and treats Windows client disconnects as transport events. These changes allowed the checkpoint to advance and the full run to finish.

## What the actual model did

Before the final local policy refresh, the 40631 saved rows contained **40 complete native scans**, **19 timeout fallbacks**, **2010 cooldown fallbacks**, **37553 budget fallbacks**, and **1009 incomplete inputs**. Some complete rows can reuse a compatible prediction, so row counts are not unique model forwards. There were **zero accepted native decisions**; the active base checkpoint is uncalibrated and policy mode does not accept its guesses as facts.

Raw predictions included internship guesses for senior engineers, directors and managers. For example, Senior Manager–Digital Product Ops was guessed to be an internship and fresher eligible despite its source-backed 8–12-year requirement. Final saved categories were protected by the recruitment policy. Completing a model scan does not establish accuracy, and changes relative to the old keyword classifier are not automatically improvements.

The base model and learned weights are unchanged. A job-specific head still needs reviewed training labels and held-out evaluation before its decisions can be accepted; no human labels or release approval were fabricated.

## Additional improvements from source-backed errors

- Intern vacancies now retain the zero-year default when a specialty, year or careers-site suffix follows `Intern`. Programme administration, recruitment occupations, supervision and converted employee roles stay distinct.
- Explicit internship-duration labels and vacancy statements identify trainee internships. Working with staff does not invalidate an internship; managing an internship does not identify the coordinator as an intern.
- Escaped and twice-escaped ATS HTML is decoded before tags are removed, preserving readable sections and reducing irrelevant model tokens. Original employer source is preserved.
- Future performance headings such as `In 3 months:` and service-bond commitments are excluded from required-work-year extraction. Financial bond trading/market experience remains valid.
- A positive subyear work requirement cannot become zero in the full-time experienced filter. Filter years remain within 1–15, while employer bounds remain separately stored.

Examples from captured adverts, verified with the shared resolver:

| Job | Source evidence | Saved before these fixes | Revised policy result |
| --- | --- | --- | --- |
| Aabasoft Digital Marketing Intern – Creative Designer | Actual Design Intern vacancy | Unspecified | Intern, 0 |
| CloudThat Training Operations Trainee | Internship duration 6 months; stipend | Unspecified | Intern, 0 |
| CloudThat Technical Trainer Intern-2026 | Internship before conversion; 2025/2026 passouts; two-year bond | Full-time Fresher, 0; bond misread as work years | Intern, 0; bond excluded from employer work years |
| GroupM Associate Director, Client Services | Escaped HTML; performance milestones; required professional years | Experienced with filter year 0 | Experienced with positive source-backed years |

A preliminary read-only policy replay covered 25620 captured jobs: 89 category changes, 142 filter-year changes and 96 employer-bound changes, with zero category/year invariant violations after replay. It was an agent-reviewed diagnostic, not a human-labelled accuracy benchmark. The final refresh and verification below supersede that partial sample.

## Actual paired native input experiment

One captured GroupM Associate Director advert was run through the same cached CPU model, two Torch threads, unchanged questions and weights, before and after source cleaning. A separate local diagnostic process exited after the experiment; it did not change the live worker or write MongoDB.

| Metric | Escaped input | Cleaned input |
| --- | ---: | ---: |
| Source tokens | 2803 | 1138 |
| Required tokenizer windows | 4 | 2 |
| Elapsed native call | 72.09 seconds | 47.53 seconds |
| Complete source scan | No, 2/4 windows | Yes, 2/2 windows |
| Experience choice | Fresher eligible, wrong | Fresher eligible, wrong |
| Employment choice | Unspecified | Internship, wrong |

Cleaning reduced source tokens by about 59% and made this scan fit the normal allowance. The 60-second worker deadline is soft because a synchronous forward can finish after it. The incomplete-before/complete-after pair does not measure full-document speedup or population accuracy. This test demonstrates improved input handling and coverage, **not improved neural classification accuracy**.

## Final local snapshot refresh

After verifying terminal completion and exited processes, the refresh applied updated policy decisions to **238 jobs across 81 local snapshots**. Changed originals are backed up in `changed-jobs-before-policy-refresh.jsonl`. It only touched `jobs.json` inside the resolved scraper directory, checked for concurrent edits before atomic replacement, preserved source fields and pre-classification fields, and recorded `policy_replay` with `complete: false` for changed decisions. It made no model request and does not claim those rows were rescanned by Laya. All 40 existing complete native rows remained unchanged; the original full-run audit and native cases are separately archived.

The fresh final audit reread all **40631 saved rows**, found no unreadable snapshots and **zero category/year invariant violations**, down from eight before refresh. Final counts are 30146 Full-time Experienced, 366 Intern, 780 Full-time Fresher, 319 Contract and **9020 Unspecified**. The unspecified rows include missing descriptions and adverts without reliable eligibility facts; those remain a limitation. These counts and the 238 changed records are not a population accuracy score. Manual source checks cover the examples above, and the complete source-backed error cases are regression tested.

The worker health endpoint was no longer listening after cleanup. No additional scrape or model worker was left running by the diagnostics or refresh.

## Verification and artifacts

**155 targeted Node tests and 25 Python tests passed.** New behavior was reproduced with failing tests before implementation. Read-only review found and helped fix financial-bond and internship-subject regressions; its final scoped check independently passed 50 recruitment/classification tests. Scoped JavaScript syntax and whitespace checks passed. The existing broad provider suite was previously observed to contain unrelated failures; this report does not claim the entire repository suite is green.

Local evidence is under `artifacts/run-logs/local-scrape-20261003T195941-resilient/analysis`: `summary-before-refresh.json`, `native-cases-before-refresh.json`, `timings.json`, `policy-replay.json`, `native-input-comparison-results.json`, and the final refresh/verification artifacts. Test logs are `.cache/laya-python/full-run-improvement-tests.log` and `full-run-improvement-python-tests.log`.

Changes and artifacts are local. No push, deployment, GitHub Actions activation, model publication, hosting-plan change, application database write or alert send was performed.
