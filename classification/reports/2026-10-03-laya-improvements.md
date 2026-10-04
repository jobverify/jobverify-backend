# Laya classification improvements — 2026-10-03

The local implementation now supplies better source context, protects explicit employer requirements, and supports training a job-specific decision head. The four American Chase jobs retain their correct source-backed categories. **The base Laya model still accepted 0 of 4 decisions. Its neural accuracy has not been shown to improve overall, and no trained production adapter is active.**

## What changed

- Employer experience is a separate input field and is repeated with the title and employment arrangement in every tokenizer window. A bare ATS `3-5` range is explained as a minimum professional experience requirement; `0` and `0-1` explicitly permit zero experience. Numeric zero survives cached source updates. Inferred scraper categories are excluded from model input.
- Explicit source years and `Freshers` eligibility outrank contradictory neural output. A manager title alone does not override a trusted zero-experience requirement. Real intern vacancy titles have a conservative fallback; internship managers, mentors, and supervisors do not become interns. Graduation dates never become professional work years by subtraction.
- Startup checks that question instructions and choices survive the SDK's token budget. Inference covers the complete source text and requires all questions plus truncation accounting in every window. Results returning after the deadline are incomplete, including the final window.
- The request allowance is 60 seconds, with a default 62-second Node HTTP wait. The shared worker budget remains 1200 seconds. Native synchronous Torch calls cannot be interrupted; Python checks deadlines between and after forwards, so its CPU deadline is soft. The client timeout bounds scraper waiting.
- Training freezes the encoder and updates the decision head, shuffles option positions, selects epochs using validation data, and leaves test jobs untouched. Local or immutable Hub adapter pins bind hashes, base revision, policy, and dataset. Synthetic smoke artifacts cannot be activated by the worker.
- Training and evaluation reject incomplete labels, duplicate raw/canonical source jobs, shared postings, and employers across splits. Evaluation retries incomplete cached scans and validates every question and selected probability before reuse. Trained candidates must use the same frozen dataset for held-out evaluation.

The base checkpoint and existing questions remain unchanged. A shorter-question experiment was reverted because it worsened seniority and internship predictions.

## Actual local sample

The same four captured American Chase source jobs were replayed through `createJobClassifier({ mode: 'shadow' })` and the real local CPU worker. The reference date was `2026-10-03T12:00:00Z`. There was no client timeout override, database connection, database write, or alert delivery. All four responses were complete; none was accepted, incomplete, or budget-skipped. The worker was stopped after verification.

| Job | Explicit source facts | Baseline category | Laya's experience choice | Guarded candidate | HTTP elapsed |
| --- | --- | --- | --- | --- | --- |
| Network Administrator | Full Time; 3–5 years | Full-time Experienced | Prior required, 53.95% | Full-time Experienced | 33.95 s |
| Corporate Trainer Intern | Intern vacancy; 0–1 years | Internship | **Prior required, 48.92% — wrong** | Intern | 54.73 s |
| Project Coordinator | Full Time; Freshers | Full-time Fresher | Fresher eligible, 70.19% | Full-time Fresher | 27.70 s |
| Associate System Engineer | Full Time; 0 years; 2025 batch | Full-time Fresher | Fresher eligible, 40.53% | Full-time Fresher | 18.17 s |

The baseline already had the correct broad categories in this captured sample. Before the context changes, Laya incorrectly chose fresher eligibility for Network Administrator (81.21%); that choice is now prior experience required. It also changed the intern from a correct but uncertain fresher choice (61.65%) to the wrong prior-required choice. The raw experience choices were correct for 3/4 jobs before and after. This is evidence for keeping the safeguards and training/evaluation requirement, not for claiming that prompting alone improved Laya overall.

The two graduate roles are now retained by the source fallback even when neural confidence is insufficient. The intern's correct guarded category comes from its actual vacancy title, not an accepted Laya prediction. Shadow mode records these candidates while public fields continue using the baseline.

Acceptance thresholds remain employment/experience 95% and seniority/leadership 90%. Confidence values are uncalibrated, and four jobs are not a release evaluation.

Verified identity:

```json
{
  "modelRevision": "55cf4c4ebb4ebe31b2550e8bdf3bd21b99753851",
  "runtimeVersion": "jobverify-laya-v2",
  "runtimeHash": "73b302c37639317b16504f57e1cc6e037aeb4337e50bf9dd4264d74a5986c993",
  "policyHash": "ede9032300304c761e7aca8eee2fa872c734e79fa26e060df1cc89f13d31c7d5",
  "calibrationHash": "uncalibrated"
}
```

Local diagnostic artifacts: `.cache/laya-improvement/before.json`, `after.json` (reverted experiment), `final.json` (direct runtime), and `live-final.json` (normal HTTP client). These contain local source text and are git-ignored.

## Training readiness and remaining work

`classification/data/2026-10-03-to-label.jsonl` contains **2695 unlabelled source jobs**: 1347 train, 539 validation, and 809 test. Each employer stays in one split. These are annotation templates, not approved labels. Review the source text, fill all expected labels and evidence, and record the reviewer before marking a row human-labelled. The file is local and git-ignored.

An actual CPU smoke training run changed head parameters while freezing the encoder, wrote **59,880,768 bytes** of head weights, and verified an exact reload using the adapter loader. Its manifest records `labelSource: "synthetic"`, `smokeOnly: true`, `encoderFrozen: true`, `testUsedForTraining: false`, and `approved: false`. This proves optimizer and serialization plumbing, not job-classification accuracy. The smoke adapter has not been selected in `model.json`.

The approximately 60 MB adapter is additional to the cached base model. It does not remove the base checkpoint or prove faster inference. Model inference and adapters belong on the Actions runner; Render receives stored classifications and the small configuration, not model weights.

Meaningful specialization still requires checked labels, then training and held-out comparison against the baseline. The release gate requires at least 200 validation and 300 test examples, >=95% accepted employment/experience precision, >=98% internship precision, >=70% coverage, zero manager-to-intern errors, and improved target-case accuracy. Instructions are in [the training guide](../README.md#train-a-small-job-specific-head). No release file was fabricated or enforcement enabled.

The four HTTP calls took about 135 seconds combined on this local machine. This does not establish throughput for the full inventory on GitHub Actions. The existing shared budget and content cache remain necessary; model classification of every new job in one free CPU run is not demonstrated.

## Verification and scope

- 135 focused Node tests passed, including source provenance, numeric zero, managers/interns, guarded categories, client caching, annotation export, filters, American Chase parsing, and temporary MongoDB integration.
- 22 Python tests passed for window coverage, question budgets, deadlines, prediction completeness, annotations, split leakage, adapters, and evaluation caches.
- Changed JavaScript syntax checks, Python compilation, and scoped tracked whitespace checks passed.
- Read-only review found no remaining material issues in the final title, fresher-precedence, and cached-choice fixes.

Changes are local. No commit, push, deployment, Actions run, model publication, billing/visibility change, application database write, or alert send occurred. Existing unrelated workspace changes were retained.
