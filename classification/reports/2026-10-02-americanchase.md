# American Chase: actual local Laya comparison

Follow-up: the source handoff and zero-experience priority were fixed locally after this run. The [2026-10-03 comparison](2026-10-03-americanchase-after-source-fix.md) records the corrected public result and the still-uncertain Laya predictions. The results below preserve the original run.

Run date: 2026-10-02, Asia/Kolkata. Only the live American Chase scraper was executed. It returned four India jobs. The same captured jobs went through public-experience enrichment, the existing classifier, and the Laya shadow pipeline. No production MongoDB writes, alerts, deployment, or enforcement took place. The local worker was stopped after the comparison.

**Outcome: zero accepted Laya decisions. This run does not demonstrate a reliable classification improvement.**

| Actual vacancy | Current public classification | Laya employment choice | Laya experience choice | Policy result |
| --- | --- | --- | --- | --- |
| [Network Administrator](https://americanchase.keka.com/careers/jobdetails/150901) | Full-time Experienced; 3–5 years | Internship, 66.69% | Fresher eligible, 87.79% | Uncertain; rejected |
| [Corporate Trainer Intern](https://americanchase.keka.com/careers/jobdetails/150843) | Intern; 0–1 years | Internship, 99.62% | Fresher eligible, 74.84% | Uncertain; rejected |
| [Project Coordinator](https://americanchase.keka.com/careers/jobdetails/142515) | Full-time Fresher | Internship, 27.39% | Fresher eligible, 94.51% | Uncertain; rejected |
| [Associate System Engineer](https://americanchase.keka.com/careers/jobdetails/88834) | Full-time Experienced; zero required years | Full-time, 39.27% | Fresher eligible, 92.93% | Uncertain; rejected |

These are selected model probabilities, not measured accuracy or calibrated confidence. The configured thresholds are 95% for employment and experience, and 90% for seniority. All four completed predictions failed the joint acceptance policy. Shadow mode left all public classifications unchanged. If enforcement were enabled, these uncertain decisions would resolve conservatively to Unspecified; enforcement remains disabled.

## The graduate-role example

The Associate System Engineer advert explicitly says “Batch Required Graduate 2025” and “Full Time (Night Shift).” The Keka source experience value is `0`. The existing classifier nevertheless returns Full-time Experienced, apparently because its Associate/Junior seniority signal influences the employment/experience category.

Laya instead selected fresher eligibility at 92.93% and entry seniority at 89.09%, which better matches that graduate opening. However, its full-time probability was only 39.27%, and both experience and seniority remained below their thresholds. This is a useful semantic indication, not an accepted correction. The original misclassification remains in the public shadow result.

A 2025 graduation cohort identifies eligible graduates. It does not establish a year of professional work experience in 2026. Full-time employment and fresher eligibility are compatible.

The Network Administrator prediction is also substantive negative evidence: its actual 3–5-year requirement conflicts with Laya's internship/fresher guesses. The guard prevented that prediction from changing the public result. The intern's correct employment prediction confirms an already-correct baseline rather than improving it.

## Latency and input limitations

The normal client allows 32 seconds per request. The first pass took 124.66 seconds overall and produced four fallbacks: three timeouts and one busy/unavailable response. A diagnostic pass used a 120-second client wait, with the model, questions, worker inspection deadline, and confidence thresholds unchanged. It collected four complete predictions; three came from the worker's completed-result cache. The one fresh Project Coordinator request took 41.61 seconds. The diagnostic pass's 42.70-second total therefore is not cold throughput for four jobs.

The initial model download took about 5 minutes 42 seconds. Windows startup hit a Hugging Face cache symlink error for a small configuration file; copying the already-downloaded configuration into its expected snapshot path allowed the offline cached startup to succeed. No model weights or third-party package code were modified.

The American Chase adapter currently emits ATS-derived `employmentType` and `experienceRequired`, but does not mark them with the classifier's trusted-source provenance fields. The canonical Laya input intentionally excludes potentially inferred fields, so those structured ATS facts were absent from model input; the full source descriptions were still provided. The next implementation work should preserve that verified provenance and assess whether it improves these cases, then evaluate prompts/calibration and CPU latency on actual held-out jobs. Lowering thresholds simply to accept these four outputs would also risk accepting incorrect internship predictions.

## Evidence and reproducibility

Model: `convaiinnovations/laya`, multilingual subfolder, revision `55cf4c4ebb4ebe31b2550e8bdf3bd21b99753851`; Laya 0.3.23, CPU, two threads. Runtime hash for this run: `209dd77b6815c0d18a728a300208d289b591c0784bbb0c7ed8a7f6fe443dd0e9`. Calibration: uncalibrated. No release report was created.

Local evidence is in `.cache/americanchase-demo/`:

- `raw-jobs.json` and `enriched-jobs.json`: actual captured source inputs.
- `baseline-jobs.json`: the existing pipeline output.
- `comparison.json`: normal-request-limit results.
- `comparison-diagnostic.json`: completed model distributions, selected decisions, timings, and policy outcomes.
- `scrape.mjs`, `prepare.mjs`, and `compare.mjs`: local-only demonstration commands; the comparison supports `--diagnostic` for the longer client wait.

The cache files are ignored by Git and may be removed by workspace cleanup. This report preserves the observed results without presenting four jobs as a passed accuracy benchmark.
