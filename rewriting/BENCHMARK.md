# CPU rewrite pilot — 20 real job descriptions

The pinned Qwen2.5-1.5B-Instruct Q4_K_M configuration completed the 20-case benchmark with **0 accepted rewrites**: 18 requests timed out and two completed outputs failed factual validation. The pipeline preserves employer descriptions in all these cases. This pilot does not establish suitable production rewrite quality or Ubuntu Actions throughput.

## Configuration and measurements

- Run date: 2 October 2026 UTC (3 October locally by completion).
- Host: Windows x64, Intel Core i7-1370P, approximately 32 GB RAM; two CPU threads; no GPU.
- Model/runtime: the immutable revisions and SHA-256 values in [model.json](model.json); llama.cpp b11146, 8192-token context, 3072-token output limit, 180-second request timeout.
- Source selection: 20 existing scraped descriptions across employers and engineering, finance, product, consulting, operations and analyst roles; 89–1751 source words. No synthetic descriptions or database publication.
- Total measured request time: 58.2 minutes. Median request: 180.0 seconds. This benchmark deliberately exceeds the production 20-minute budget to measure all 20 cases.
- Peak worker working set: 2.52 GiB. This is the worker process measurement, excluding Node and other operating-system processes.
- Cached runtime/model startup on the resumed run: NaN seconds; download time is excluded.
- The two complete responses generated 795 and 703 tokens at approximately 6.7 and 6.6 tokens/second. Their visible text was only 111 and 112 words; JSON and evidence consume additional tokens.

The run resumed after a tool-session interruption at case eight. The first eight requests used the initial prompt; the final twelve used the hardened prompt. Generation-policy hashes record those cohorts. Both completed responses were revalidated against the final publication policy. This is an exploratory mixed-prompt pilot, not a controlled comparison of model revisions.

## Results

| Case | Employer and role | Source words | Request seconds | Outcome |
| --- | --- | ---: | ---: | --- |
| 1 | NVIDIA — CPU Verification Engineer | 362 | 180.1 | timeout |
| 2 | Salesforce — Senior Technical Consultant - Revenue Cloud / Consumer Goods | 1096 | 180.0 | timeout |
| 3 | Intel — DFT Design Engineer | 89 | 127.3 | invalid_evidence |
| 4 | Medtronic — Senior Finance Manager | 1439 | 180.0 | timeout |
| 5 | Pfizer — Associate Instrumentation Engineer | 504 | 180.0 | timeout |
| 6 | Mastercard — Senior Product Manager - Technical | 486 | 180.0 | timeout |
| 7 | Visa — Senior Systems Engineer - Storage, Backup, Hitachi | 815 | 180.0 | timeout |
| 8 | Caterpillar — Autonomy Test Engineer | 1012 | 180.0 | timeout |
| 9 | Red Hat — Business/Data Analyst - Training & Certification | 944 | 180.0 | timeout |
| 10 | Rockwell Automation — Quality Lead | 872 | 180.0 | timeout |
| 11 | Target — Sr Process & Quality Consultant | 1054 | 180.0 | timeout |
| 12 | BNY Mellon — Senior Specialist, Data Transfer, Integration & Quality | 232 | 180.0 | timeout |
| 13 | Amazon — Sr. FinOps Analyst - AP, Grocery AP Settlement | 444 | 180.0 | timeout |
| 14 | Capgemini — Pyspark Developer | 410 | 180.0 | timeout |
| 15 | Quantiphi — Architect - Data Modeller | 1056 | 180.0 | timeout |
| 16 | Bosch Global Software Technologies — Senior Developer(SAP DM Support) - ECF2 | 285 | 180.0 | timeout |
| 17 | Adobe — Deal Desk Analyst 3 | 382 | 125.9 | preferred_promoted |
| 18 | ABB — Workday Advanced Compensation Subject Matter Expert | 437 | 180.0 | timeout |
| 19 | Shell — Benchmarking Excellence Specialist | 1751 | 180.0 | timeout |
| 20 | Thales — Industrial Data & AI Engineer | 542 | 180.0 | timeout |

## Factual preservation and readability

The Intel response copied several useful skills and qualifications, but its overview evidence concatenated facts into an excerpt absent from the input. It also produced empty preferred/application placeholders and grouped skill requirements under responsibilities. Its brief copied phrases did not demonstrate a useful long-form rewrite. Validation rejected it as invalid_evidence.

The Adobe response placed “MBA preferred” inside required qualifications, inserted unsupported section placeholders, and omitted much of the source detail. The overview was a long copied paragraph rather than an improved organization of the full source. Validation rejected it as preferred_promoted. Neither completed output is publishable. Timeout cases have no completed text to assess, so no factual-preservation or readability score is inferred for them.

## Implication and reproduction

The configured model, evidence-heavy JSON format and three-minute request limit did not meet the intended rewrite goal on this host. Changing the prompt, output format, timeout or model requires another benchmark; the safety checks should remain in place. Ubuntu Actions performance still needs measurement. Setting JOB_DESCRIPTION_REWRITE_MODE=off disables generation while preserving published descriptions and source provenance.

Run the database-free benchmark with exactly 20 representative employer-source job objects:

    npm run descriptions:benchmark -- --input /path/to/20-source-jobs.json --output /path/to/report.json

Use --resume with the same input and configuration after an interruption. The full local input, per-case sections/evidence, token timings and logs from this pilot are saved in the workspace artifact directory artifacts/description-rewrite-implementation. Those artifacts contain employer text and are not uploaded by the production workflow. Automated checks are conservative proxies and cannot prove sentence-level entailment. Longer output does not guarantee AdSense approval; see the [publishing limitation](README.md#publishing-limitation).
