# American Chase after fixing source provenance and zero-experience priority

Sample date: 2026-10-03, Asia/Kolkata. Four jobs were scraped live from American Chase again. The run used the same pinned multilingual Laya model, questions, thresholds, and source-text handling as the previous comparison. No production database, alerts, deployment, model weights, or confidence thresholds were changed.

## Implemented fixes

- The American Chase adapter now preserves ATS-derived employment and experience in `sourceEmploymentType` and `sourceExperienceRequired`. A numeric ATS `0` survives as the source string `0` through normalization and canonical model input.
- The normalizer gives an explicit 0 or 0–1-year requirement priority over a stale Junior Level inference. Associate seniority remains a separate signal. The graduate opening now has Entry Level experience eligibility and the public Full-time Fresher category.
- Tests reproduce both original defects and verify the corrected source handoff and MongoDB/API/alert consistency. The two focused suites passed 114 and 39 tests respectively, for 153 tests total. Syntax and whitespace checks passed.

## Actual results

| Job | Public category before fixes | Corrected public category | Laya employment choice | Laya experience choice | Accepted AI decision |
| --- | --- | --- | --- | --- | --- |
| Network Administrator | Full-time Experienced | Full-time Experienced | Full-time, 82.80% | Fresher eligible, 81.21% | No |
| Corporate Trainer Intern | Intern | Intern | Internship, 98.77% | Fresher eligible, 61.65% | No |
| Project Coordinator | Full-time Fresher | Full-time Fresher | Full-time, 35.21% | Fresher eligible, 93.44% | No |
| Associate System Engineer | Full-time Experienced | **Full-time Fresher** | Full-time, 69.12% | Fresher eligible, 93.46% | No |

Zero of four model decisions passed the unchanged joint acceptance thresholds. The graduate role's full-time probability increased from 39.27% to 69.12%; its entry-seniority probability increased from 89.09% to 96.73%. Those changes support the input fix, but do not establish acceptable job-classification accuracy. Model probabilities are not measured accuracy.

The graduate opening's improvement comes from the corrected explicit-source rule: ATS full-time employment plus zero required years resolves to Full-time Fresher. It is not a successful AI override. Its source-backed conservative candidate also resolves to Full-time Fresher despite the rejected AI decision.

Laya still incorrectly preferred fresher eligibility for the Network Administrator, which has a source requirement of 3–5 years. The source-backed candidate retains Full-time Experienced and the `[3, 4, 5]` experience buckets. Lowering confidence thresholds would not improve the underlying prediction.

## Timing and activation

The diagnostic client allowed 120 seconds to observe complete predictions. All four were freshly inferred, with no worker cache hits: 43.17, 38.71, 33.90, and 30.98 seconds, totaling 147.11 seconds. The production client limit remains 32 seconds, so this is not a demonstration that the existing CPU timeout is adequate. The worker was stopped after the run.

Shadow mode leaves the corrected baseline public fields in place. Enforcement remains disabled, and no evaluation release was fabricated. These four jobs do not establish whether Laya beats the corrected baseline on a representative dataset. Further model selection, domain training, calibration, and CPU performance work require separate held-out evaluation before activation.

Local inputs, complete selected decisions and model distributions, and timings are saved under `.cache/americanchase-fixed/`. The earlier failures remain recorded in [the original comparison](2026-10-02-americanchase.md). No push or production deployment was performed.
