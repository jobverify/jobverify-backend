# Structured Workday descriptions and actual Laya verification

Workday's public SEO descriptions can flatten employer qualification bullets into one paragraph. The scraper now reads the board's structured detail API first and preserves the complete plain-text paragraph/list structure as `sourceDescription`. Missing, blocked or malformed API descriptions retain the existing HTML fetch. Throttling and server failures retain existing failure handling without an extra HTML request. Authoritative countries reject foreign-only Remote jobs and preserve India primary or secondary locations.

The backend changes passed 104 selected Workday checks in review and 182 focused classification/publication checks. The separate recruitment candidate passed 119 checks (79 recruitment and 40 classification/client checks); all 15 source-update, transaction and finalization guards passed. These are regression counts, not accuracy measurements. The recruitment patch remains isolated until the existing full run finishes naturally.

Twenty actual descriptions from SOTI, Caterpillar, CrowdStrike, Broadridge, Broadcom and DBS were fetched from employer APIs and processed by the pinned multilingual Laya checkpoint on an isolated CPU worker at port 8766. The existing full scraper and its worker on port 8765 were untouched. Every corrected input completed all its windows and all four questions. Actual full probability distributions and original completion provenance were saved in the native cache; no neural outputs or human labels were fabricated. The final probe reused 14 actual responses and created six new scans. The isolated worker stopped after verification, and a separate read-only replay verified all 20 responses under the final candidate.

| Job | Employer evidence | Raw Laya employment / experience | Final source-backed filter |
| --- | --- | --- | --- |
| Technical Support Specialist, Level 3 (Gurgaon, R10256-2) | Required enrollment in a post-secondary university program | internship / fresher_eligible | Intern; 0 years |
| Procurement Specialist (R10267-1) | 1–2 years of procurement experience; Excel preference is a separate bullet | full_time / fresher_eligible | Full-time Experienced; 1–2 years |
| Sales Development Representative-1 (R10274) | 1 year of relevant experience | internship / fresher_eligible | Full-time Experienced; 1 year |
| Accountant, Indirect Tax | Required core VAT/GST experience | internship / fresher_eligible | Full-time Experienced; 1–15 years inferred |
| IT Architect, Azure Cloud | Required hands-on cloud architecture experience | internship / fresher_eligible | Full-time Experienced; 1–15 years inferred |
| Accounting Associate, Indirect Tax (two vacancies) | Required core tax experience; one vacancy separately prefers 3+ years | internship / fresher_eligible | Full-time Experienced; 1–15 years inferred; preferred years retained separately |
| HR Operations Coordinator | Mandatory minimum 2 years | unspecified / fresher_eligible | Full-time Experienced; 2–15 years |
| Corporate Account Executive (Kolkata, Bangalore, Mumbai) | Proven experience under What You'll Need | internship / fresher_eligible | Full-time Experienced; 1–15 years inferred |
| Specialist, US Payroll | 6+ years in AMER payroll; country payroll preference is separate | unspecified / mixed | Full-time Experienced; 6–15 years |
| Channel Solution Architect | Required proven consulting/sales engineering experience | internship / fresher_eligible | Full-time Experienced; 1–15 years inferred |
| Legal Executive Assistant | 5+ years of legal administrative experience | internship / fresher_eligible | Full-time Experienced; 5–15 years |
| Java, Angular Full stack developer | Requires in-depth knowledge and experience | internship / fresher_eligible | Full-time Experienced; 1–15 years inferred |
| Python full stack + AWS | Requires in-depth knowledge and experience | full_time / fresher_eligible | Full-time Experienced; 1–15 years inferred |
| IO and Mixed Signal Circuit Design Engineer | Minimum 5–15 years of hands-on experience | internship / fresher_eligible | Full-time Experienced; 5–15 years |
| Associate, Application Developer | 4–6 years of backend development experience | internship / fresher_eligible | Full-time Experienced; 4–6 years |
| Data Analyst and Data Engineer (two vacancies) | Strong hands-on experience under Required Skills | full_time / fresher_eligible | Full-time Experienced; 1–15 years inferred |

The base model remains uncalibrated and its experienced-role predictions remain wrong in these examples. The improvement comes from retaining employer structure and applying the user's approved category defaults. Every final sample includes actual native coverage, but `decisionSource` remains `policy`. This does not establish learned-model accuracy or enable enforcement.

The full dry run is still in progress. At 2026-10-03 23:49 UTC, 16 of 4,670 sources had completed with 371 stored jobs, 371 complete native scans and zero coverage/provenance issues; 43 live rows were unresolved under the active resolver. These totals are a progress snapshot, not final verification. The new sample corrections have not yet replaced those live snapshots.

The watcher audits every stored job's source hash, complete native windows, four probability distributions, original native identity and final policy fields. A separate finalizer waits for natural successful completion; it then checks the prepared patch and source hashes, applies the tested recruitment corrections, reuses actual unchanged scans, updates only the 20 guarded employer descriptions, and audits all saved jobs again. A changed/missing original, failed full run or missing native response blocks final verification. No application MongoDB writes, alerts, push or deployment were performed.

Required candidate headings and explicit prior experience can imply the user's 1–15 filter bracket without inventing employer-stated years. Optional heading suffixes before or after the colon, same-experience qualifiers, geographic aliases, company history, and duties have counterexamples. An independent country payroll preference is separated only from an explicit AMER/APAC/EMEA/LATAM payroll requirement. Other ambiguous preferences remain optional. ATS nonbreaking hyphens are normalized only in rule parsing; native input bytes and original scan provenance remain intact.

Finalization stages all verified outputs before publication and keeps original backups plus a transaction journal. Publication failures roll back, interrupted attempts remain recoverable, and a failed final audit can retry against a validated committed receipt. Fifteen source/recovery/finalization checks passed; review found no Important remaining findings in this scope. This verifies recovery behavior in isolated fixtures, not completion of the still-running full catalog.

Evidence is under `artifacts/run-logs/local-scrape-20261004T003853284-resilient/analysis/`: `structured-laya-samples.json`, `structured-probe-20-samples.log`, `structured-candidate-replay.json`, captured `soti-*-structured.json` and `workday-*-structured.json` responses, `structured-source-overrides.json`, `finalize-manifest.json`, `finalize-status.json`, and `summary.json`.
