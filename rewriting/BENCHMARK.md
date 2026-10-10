# CPU description organization — 20 real jobs

The final job-description-fact-plan-v11 pilot completed **20 cases: 19 accepted and 1 retained as employer source**. The skipped BrowserStack description mixes mandatory and preferred clauses; its input is retained rather than assigning a misleading requirement heading. No MongoDB publication occurred in this benchmark.

## Configuration and measured capacity

- Date: 5 October 2026 (India); native run timestamps 2026-10-04T21:23:19.928Z to 2026-10-04T21:31:23.625Z.
- Host: win32 x64, 13th Gen Intel(R) Core(TM) i7-1370P, two CPU threads, no GPU. This host had other workloads; timings are observed shared-host values, not an isolated CPU experiment.
- Model: Qwen2.5-1.5B-Instruct Q4_K_M, immutable revision/runtime/SHA-256 values in [model.json](model.json); llama.cpp b11146, 8192-token context, 768 output-token cap and 180-second request timeout.
- Cached runtime/model setup: 10.0 seconds. Model download time excluded.
- Reported p50 case time: 17.06 seconds; total sequential measured case time: 7.09 minutes. One case is an immediate preflight skip.
- Maximum measured worker working set: 1.94 GiB, excluding Node and other processes.
- Uncached model requests: 19; unchanged compact request signatures can reuse validated numeric plans across later batches. This native pilot does not measure Ubuntu Actions throughput.

## Results

| Employer and role | Source words | Organized words | Seconds | Outcome |
| --- | ---: | ---: | ---: | --- |
| American Chase — Network Administrator | 488 | 552 | 22.23 | accepted |
| American Chase — Corporate Trainer Intern | 552 | 574 | 9.76 | accepted |
| American Chase — Project Coordinator | 427 | 464 | 12.81 | accepted |
| American Chase — Associate System Engineer | 287 | 318 | 14.08 | accepted |
| ABB — Global Product Specialist Process Performance Motors (flexible location) | 510 | 565 | 27.40 | accepted |
| Allstate — Reconciliations Analyst II | 517 | 558 | 14.26 | accepted |
| Airbus — Full Stack Developer | 549 | 591 | 16.46 | accepted |
| Amadeus — Software Development Engineer 3 | 387 | 436 | 14.47 | accepted |
| Alation — Manager, General Accounting | 918 | 898 | 34.46 | accepted |
| Alteryx — Technical Writer | 645 | 695 | 44.74 | accepted |
| Altera — Blue Yonder Integration/Tech Lead | 552 | 579 | 18.29 | accepted |
| Soti — Technical Support Specialist, Level 3 | 638 | 714 | 48.17 | accepted |
| AVEVA — R&D Senior Member of Technical Staff, Product Development | 922 | 1009 | 14.19 | accepted |
| BrowserStack — Account Manager - Strategic Sales | 742 | — | 0.01 | mixed_requirement_scope |
| Bloom Energy — Senior Staff Engineer-Supplier Quality | 207 | 254 | 33.63 | accepted |
| Broadcom — IC Verification Engineer | 270 | 298 | 25.79 | accepted |
| Broadridge Financial Solutions — Product Lead - AI | 474 | 519 | 25.45 | accepted |
| Cadence — Design Engineer II | 128 | 156 | 16.73 | accepted |
| Caterpillar — Accounting Associate | 992 | 962 | 17.06 | accepted |
| Cloudera — Sr. Staff Platform Operations Engineer (with OpenStack) | 608 | 667 | 15.34 | accepted |

## Manual source comparison

The gain is clearer navigation through responsibilities, qualifications, optional skills, employment terms, employer information and application details. The model selects an exact source overview and categorizes genuinely ambiguous unlabelled facts; the renderer keeps detailed employer wording. This is model-assisted organization, not free-form prose expansion.

American Chase Associate System Engineer remains 287 source words and 318 organized words. It preserves graduation year 2025, BE/B.Tech/MCA eligibility, 55% academic criteria, full-time night shift, onsite Indore, INR 321,000 / 3.21 LPA and 90-day probation. Network Administrator education/certification facts remain preferred under their employer heading. Project Coordinator recruitment steps retain their original numbers and complete text.

Manual reviews of earlier accepted diagnostic outputs found scope errors beyond automated acceptance. The final parser fixes combined/flattened headings, common heading variants, required versus preferred clauses, employer/team boundaries, mandatory awareness/commitment conditions, interposed job-title metadata and duplicated extracted qualifications. Regression coverage also protects Unicode metadata and dedicated job location from accidental omission. The reference plan does not test factual paraphrasing.

Remaining limitations include original employer boilerplate, PDF-flattened benefit lists, incomplete source phrases and contradictory source content. For example, the Project Coordinator application text names a different role, and the SOTI posting mixes a graduate-role narrative with experienced-role qualifications. The pipeline retains those employer claims; layout changes cannot resolve them. Fact coverage and added-claim counters are structural proxies, not proof every source interpretation is correct.

## Workflow and reproduction

Scraping/classification and rewriting are separate sequential Actions jobs. Generation has a 350-minute hosted-job limit, a 315-minute step limit, and a five-hour default total runtime budget including setup. The durable source-hash MongoDB queue resumes pending inputs on subsequent scheduled runs. Disk plans store numeric decisions plus a request signature; each cached result is rebuilt and validated against its current full source. Source/filter fields are retained and publication is conditional on the current source hash. See [runtime and publishing details](README.md).

Run a database-free benchmark with exactly 20 source job objects:

    npm run descriptions:benchmark -- --input /path/to/20-source-jobs.json --output /path/to/report.json

Use --resume only with unchanged input, model and policy. Current full local input, original/output descriptions, numeric plans, timings and logs are in the workspace artifact directory `artifacts/description-rewrite-improvement-20261004T185907` (`benchmark-v11-final-report.json` and `american-chase-before-after.md`). These employer-text artifacts are not part of production diagnostic uploads.

## Historical free-form pilot

The earlier evidence-heavy prose pilot had zero accepted results in 20 cases: 18 timeouts and two rejected factual outputs. That motivated compact source-fact decisions instead of repeating source text and evidence in model output. Its case mix and prompts differ from this benchmark, so no controlled speed or quality improvement percentage is claimed. The earlier documentation referenced a raw pilot artifact directory that is absent here; its historical summary is retained for context. Longer output does not establish [AdSense eligibility](https://support.google.com/publisherpolicies/answer/11190248?hl=en).
