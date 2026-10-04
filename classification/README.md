# Laya classification on the scraper runner

The daily scraper workflow now starts one CPU Laya worker on `127.0.0.1:8765`, classifies enriched source text before upsert and alert matching, and saves a bounded decision in MongoDB. Render continues running Node only. The checkpoint and Python dependencies live on the Actions runner, never in MongoDB or the Render deployment.

## Initial operation

The workflow uses **policy** mode unless evaluated `enforce` mode is selected. Every publishable job must have a complete Laya scan before MongoDB upsert, expiry processing or alerts. The final category and experience follow the user-approved recruitment defaults, preserving the employer's original requirements separately. Raw uncalibrated model guesses remain diagnostic. Dependency, startup or unrecovered scan failures block publication; they cannot switch remaining jobs to keyword-only results. Local `shadow` and `off` are explicit diagnostic modes. `enforce` requires a compatible, passed `classification/release.json`. GitHub uses these changes after the branch is published.

The existing `MONGO_URI` secret is reused. No inference API key, paid service, new Render service, or repository visibility change is required. Standard public-repository runner usage is free; private repositories still consume the account's Actions allowance. Monitor existing scraper time plus model startup/inference before relying on the private allowance. This implementation does not change billing settings.

| Setting | Default | Purpose |
| --- | --- | --- |
| `JOB_CLASSIFICATION_MODE` | workflow and local scraper commands: `policy` | Complete scans plus reviewed defaults; evaluated model decisions in `enforce`; explicit local diagnostic `off`/`shadow` |
| `LAYA_CACHE_DIRECTORY` | `.cache/scraper-actions/classification-cache` | Atomic checkpoints of complete decisions for interrupted scans |
| `LAYA_CPU_THREADS` | `2` | One model with bounded CPU use |
| `LAYA_ENDPOINT` | `http://127.0.0.1:8765` | Localhost only |
| `LAYA_RELEASE_FILE` | workflow: `classification/release.json` | Passed evaluation and frozen calibration |
| `HF_HOME` | `.cache/laya-model` | Cached single multilingual checkpoint |
| `LAYA_PYTHON` | `python` | Optional local Python executable |

Requests inspect the whole available cleaned body in overlapping tokenizer-sized windows, repeating the title and explicit employer employment/experience facts. Bare ATS ranges are explained as minimum requirements. Graduation-year subtraction is a product filter inference, separate from employer-stated work experience. Startup audits the question token budget to reject silently cut instructions/options. Missing questions, missing truncation accounting, uninspected, conflicting, invalid, or low-confidence predictions cannot be accepted.

There is no shared inference time budget. The obsolete `LAYA_TOTAL_BUDGET_SECONDS` environment variable is ignored, including values left in an existing terminal. A single description request has a one-hour failure deadline, with a two-second client reserve. Native localhost HTTP avoids fetch's separate five-minute header timeout. Python checks deadlines between windows and after each prediction; a synchronous Torch forward can overrun by one forward. Policy/enforce retry transient failures up to three times, then keep the source unpublished and pending for retry. Missing or oversized descriptions also block that batch. A fully inspected but uncertain model result may publish the reviewed category defaults; `complete` describes coverage, not prediction accuracy.

The parallel source lifecycle clock pauses while waiting for classification and resumes for persistence. Scraping and enrichment remain bounded, and shutdown cancels queued/native requests. Completed decisions, including uncertain results, are reused from MongoDB, memory and atomic disk checkpoints only when content, mode, model/runtime/policy/calibration identities and reference year match. Failed/incomplete requests are never cached. Cached predictions retain each job's own rollback snapshot. Disk checkpoint failures are reported but do not discard verified complete scans held in memory.

Standard hosted public-repository minutes are free, but [GitHub limits each hosted job to six hours](https://docs.github.com/en/actions/reference/limits). The workflow permits 360 minutes and stops the scraper step after 310 minutes, reserving time to stop the worker, save caches and upload diagnostics. It restores completed model scans across runs; rerunning the same workflow additionally restores its source checkpoint. Failed classification sources stay pending, and changed descriptions are scanned again. An interrupted run may require **Re-run failed jobs** to finish the catalog. A new scheduled run scrapes the whole catalog again and can reuse matching completed scans. Full native coverage of tens of thousands of jobs can require many CPU hours; removing the old cutoff does not guarantee a complete catalog within one hosted job.

Only employer facts belong in `sourceEmploymentType`/`atsEmploymentType`/`rawEmploymentType` and `sourceExperienceRequired`. Existing inferred `employmentType`, `jobType`, and `experienceLevel` are excluded from model input. Scrapers can alternatively mark a source field with `employmentTypeProvenance: 'source'` or `experienceRequiredProvenance: 'source'`. `eligibleBatches` must have `eligibleBatchesProvenance: 'source'` to count as cohort evidence; otherwise cohorts are read directly from the advert. Descriptions, qualifications, responsibilities, requirements, graduation eligibility, and source publication date are included. The current reference year uses Asia/Kolkata and participates in cache identity.

The user-approved category defaults take precedence over conflicting employer requirements:

| Vacancy evidence | Public category | Experience filter |
| --- | --- | --- |
| Actual intern vacancy, or mandatory current bachelor/master student eligibility | Intern | 0 |
| Current-year graduates, or recently completed bachelor/master graduates | Full-time Fresher | 0 |
| Older graduating cohort | Full-time Experienced | Current year minus graduation year, bounded to 1-15 |
| Established manager/senior role without stated years | Full-time Experienced | 1-15, inferred |
| Otherwise explicitly required work experience | Full-time Experienced | Source-required years; preferred years remain separate |
| Contract vacancy | Contract | Required years or applicable eligibility default |

For example, a 2025 graduate in 2026 gets filter year 1 even if the employer says zero; an internship requiring two years gets filter year 0. These defaults do not verify a candidate's employment history. MongoDB retains `sourceExperienceRequired`, `classification.resolved.employerExperienceProfile`, `experienceBasis`, and the inference marker on inferred profiles. An ordinary completed-degree qualification does not override a positive required-years statement. Optional studies, mixed completed-or-pursuing eligibility, duties mentoring graduates, contract-management occupations, and unrelated calendar years are disambiguated. Rows with insufficient evidence retain `Unspecified`; missing descriptions never become complete scans. API queries and alert matching use the same stored classification, and Intern plus zero-years filters now match.

The policy is `laya-jobs-v2`. The Laya questions carry these defaults, and the Node resolver applies them consistently after a complete scan, including uncertain model predictions. An unavailable worker blocks policy publication. Policy results are labelled `decisionSource: 'policy'`; they are not reported as accepted neural decisions or as improved learned model weights.

## Local run

The existing resilient launcher now installs and checks CPU Laya before starting any scraper child. On Windows it downloads portable Python 3.12.10 into `.cache/laya-python` when missing, installs pinned CPU dependencies, and waits for the checkpoint to download and the worker to report a compatible ready identity. Cached installations are verified and reused. An installation or readiness failure stops startup instead of silently launching a scraper without the model.

```powershell
cd C:\Users\mohv\GitHub\Release-26.09.04\jobverify-backend
npm run scrape:parallel:dry:resilient -- -NoClean
$active = Get-Content ..\artifacts\run-logs\active-dry-run-scrape.json | ConvertFrom-Json
Get-Content -Wait -LiteralPath "$($active.runDir)\pipeline.log"
```

Your existing concurrency and logging commands also work. The command above skips cleanup. Routine cleanup also now keeps Laya's Python, model/venv caches and worker ownership, together with the description-model cache; it still deletes generated job snapshots and other disposable artifacts. The resilient launcher automatically starts and stops its own Laya worker.

The supervisor logs installation/warmup progress, starts scrapers only after readiness, keeps its worker across runner retries, and stops the worker it started after the run finishes or fails. Plain scraper commands now also prepare Laya automatically. A ready compatible worker started elsewhere is reused and left running. Ten scraper slots can fetch sources concurrently while one shared CPU model handles queued classification; ten copies of the model are not loaded. `JOB_CLASSIFICATION_MODE=off` explicitly skips local setup. Restart an existing v3 worker before a fresh run to load runtime v4; another run's worker is not silently replaced.

Dry runs log enrichment, classification and snapshot-write stages. Classification reports counts approximately every 15 seconds while waiting and every 25 processed jobs. Required modes wait 30 seconds between transient retries of the same job; queued jobs do not receive cooldown fallback. The dry-run snapshot uses the same complete-scan publication gate as MongoDB. Explicit shadow diagnostics retain the earlier fallback/cooldown behavior. See the [required-scan verification](reports/2026-10-03-required-laya-scans.md) and the historical [local stall investigation](reports/2026-10-03-local-scrape-stall.md).

For standalone scraper commands, install and start Laya manually:

Use Python 3.12 and Node 24. Install only the CPU wheel:

```sh
python -m venv .cache/laya-venv
# Activate this environment using your shell's activation command.
python -m pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r classification/requirements.txt
python -m unittest discover -s classification -p 'test_*.py'
```

Set `JOB_CLASSIFICATION_MODE=shadow` in your shell, then:

```sh
node scripts/layaWorker.js start
node scripts/smokeLaya.js
npm run scrape:parallel:dry
node scripts/layaWorker.js stop
```

The smoke command needs no database and writes `.cache/scraper-actions/laya-smoke.json`. These illustrative cases verify the integration; they are not a human-labelled accuracy benchmark. The worker startup has a ten-minute deadline and checks the pinned model/policy identity. The supervisor retains its exact child process handle for cleanup even if health becomes unresponsive. Standalone CLI cleanup verifies the worker instance id before stopping its process.

To run the first configured scraper (currently ABB), give every returned job to the shared classifier and preview the results:

```sh
node scripts/classifyScraper.js --output=.cache/classification-runs/first-source.json
# Preview any source:
node scripts/classifyScraper.js --source=americanchase
# Optional capture and replay:
node scripts/classifyScraper.js --source=abb --capture-only --output=.cache/classification-runs/abb-capture.json
node scripts/classifyScraper.js --source=abb --jobs=.cache/classification-runs/abb-capture.json
```

This CLI uses `policy` mode explicitly. `--apply` upserts the selected source's eligible returned jobs after classification, without queuing alerts, expiring other vacancies, or rewriting descriptions. The CLI refuses to overwrite reports, rejects mismatched captured sources, and writes a progress snapshot after each classified job. `--all` previews every configured source; it does not change the scheduled workflow. Model budget skips, incomplete scans, and unavailable workers are recorded rather than called successful model inference. Fetching full detail pages depends on the individual scraper's detail budget; Laya cannot recover requirements absent from the supplied text.

## Evaluate before replacing public fields

1. Export actual jobs with available descriptions: `node scripts/exportClassificationDataset.js --output=.cache/classification/unlabelled.jsonl --limit=1000`. This is read-only on MongoDB and refuses to overwrite an existing output file.
2. Have humans annotate the source text. Each JSONL row needs a unique `id`, nonempty `companyKey`, `job`, explicit `referenceDate`, `labelSource: "human"`, `labelledBy`, `split: "validation"` or `"test"` (plus `"train"` when fine-tuning), `targetCase`, and all four `expected` labels. Allowed employment/experience/seniority/leadership labels are in `policy.json`. Non-leadership jobs use `expected.leadership: "unknown"`. `expected.jobType` uses `Intern`, `Full-time Fresher`, `Full-time Experienced`, `Contract`, `Others`, or `Unspecified`, consistent with employment/experience. Include leadership detail where applicable. Mark cohort, manager, and trainee edge cases with `targetCase: true`.
3. Use at least 200 validation and 300 disjoint test jobs, including at least 50 internships and 50 leadership roles in the test set. Balance ordinary and ambiguous cases. Do not use model predictions as labels. Fix the split before evaluation and do not tune on the test set.
4. Run `python classification/evaluate.py .cache/classification/labelled.jsonl --predictions=.cache/classification/predictions.jsonl --output=classification/release.json`. The prediction checkpoint is resumable for the exact dataset/model identity. Validation fits temperatures and selects thresholds; the untouched test split checks the final Node policy, including source contradictions and conservative fallbacks.
5. A release must achieve accepted employment and experience precision >=95%, internship precision >=98%, accepted coverage >=70%, zero manager-to-intern errors, and better accuracy than the baseline on target cases. Failure writes an unapproved report and exits unsuccessfully. Its digest binds the model, policy, calibration, thresholds, dataset, and metrics.
6. After a passed report is reviewed and committed, set the Actions variable to `enforce`. Run the workflow manually and inspect diagnostics before relying on the daily run. Changing a checkpoint, head adapter, policy, runtime, or calibration requires reevaluation and invalidates cached decisions. A trained adapter must be evaluated against the exact frozen full dataset used for training, retaining its untouched test split. Evaluation reuses only complete compatible predictions; incomplete scans are retried.

There is deliberately no fabricated `release.json` or automatically labelled 500-job dataset in this repository.

## Train a small job-specific head

The publisher describes the base checkpoints as models to specialise, rather than reliable zero-shot decision engines ([model limits](https://huggingface.co/convaiinnovations/laya#honest-limits)). The included trainer freezes the large encoder and trains the decision head. The measured adapter is approximately 60 MB, added to the existing cached base checkpoint. Training is a separate manual task; it does not run on every daily scrape or on Render.

Prepare actual local scraped jobs for review without connecting to MongoDB:

```sh
node scripts/prepareLayaTrainingDataset.js --output=classification/data/to-label.jsonl --limit=3000
```

The export has no labels. It removes duplicate cleaned jobs, groups each employer into one split, and allocates roughly 50% training / 20% validation / 30% test. Freeze the export before annotation; regenerating it with changed source inventory may change employer allocations. The prepared 2026-10-03 file contains 2695 jobs: 1347 train, 539 validation, 809 test. JSONL data stays git-ignored, outside disposable `.cache` when using `classification/data/`. Review the source text, fill `expected`, `evidence` and `labelledBy`, and set `labelSource: "human"` only after human review. Target-case flags are suggestions for review, not labels. Balance freshers, experienced roles, real internships, managers, trainees, required versus preferred years, and ambiguous adverts.

Training requires at least 100 human-labelled training jobs and 20 validation / 20 test jobs. Activation still requires the larger 200-validation / 300-test evaluation gate above. Raw and canonical source duplicates, shared postings, and employers across splits are rejected. Training never predicts or optimizes against test jobs; validation selects the best epoch. Training shuffles option order to reduce position bias.

```sh
python classification/train.py classification/data/labelled.jsonl --output=.cache/classification/job-head --epochs=3
# On available GPU compute, use --device=cuda instead; inference remains CPU on Actions.
```

The trainer prints `headAdapter` with its directory and SHA-256 digests. Set `classification/model.json`'s `headAdapter` to that printed object to benchmark/evaluate the candidate locally, then run `evaluate.py` with the same labelled JSONL. This pin changes runtime/cache identity. A candidate remains unapproved until held-out evaluation passes.

For Actions, a pinned Hub adapter can use `{"repoId":"your-account/job-head","revision":"<40-character immutable commit>","manifestHash":"<sha256>","weightsHash":"<sha256>"}` in `headAdapter`. Uploading a model is a separate user action. The worker downloads only `manifest.json` and `head.safetensors` into the existing Actions model cache and verifies both digests, base revision, and questions. Render imports only the small pin/configuration, never the model files.

To verify optimizer updates, encoder freezing, and saved-weight round trips without human labels:

```sh
python classification/train.py --smoke --output=.cache/classification/smoke-head
```

This produces a clearly marked **synthetic smoke artifact** that the production loader refuses to activate. It proves training plumbing works, not classification accuracy.

Replay a captured source-job array without database writes or alerts:

```sh
python classification/benchmark.py --jobs=path/to/source-jobs.json --output=.cache/classification/comparison.json --reference-date=2026-10-03T12:00:00Z
```

It records complete distributions, token-budget audit, runtime identity, source-backed candidate, and timing. It cannot approve a release. See the dated reports for actual results, including unsuccessful prompt experiments.

## Historical jobs and recovery

Complete native responses are stored separately from derived filter decisions under `.cache/scraper-actions/classification-cache/.native/`. A recruitment-rule fix can replay the actual four probability distributions for identical source content and reference year. Changed model code, weights, questions or calibration require new scans. `classification.nativeScan` retains the original worker identity, canonical input hash and completion time; `classification.runtimeHash` identifies the resolver that produced the final fields. Required modes still check a compatible live worker at each source batch, and cached responses cannot bypass the human evaluation gate.

With a running worker and your normal database environment, the backfill is a preview by default:

```sh
node scripts/backfillJobClassifications.js --mode=shadow --limit=1000
node scripts/backfillJobClassifications.js --mode=shadow --apply --limit=1000
# After the evaluation gate passes and the worker loads the release:
node scripts/backfillJobClassifications.js --mode=enforce --apply --limit=1000
```

It saves a cursor checkpoint after each successful batch, preserves fingerprints/lifecycle, and does not queue historical alerts. Rows without source descriptions are counted and skipped; rescraping is needed to recover missing source content. Concurrently updated rows are skipped using optimistic matching and reported; retry those with a fresh checkpoint. Use `--checkpoint=<path>` for independent runs. Dataset summaries refresh after applied changes.

To restore saved pre-classification public fields, preview and then apply rollback:

```sh
node scripts/backfillJobClassifications.js --rollback --limit=1000
node scripts/backfillJobClassifications.js --rollback --apply --limit=1000
```

Rollback removes shadow metadata without changing public fields; enforced rows restore the bounded prior canonical fields. Stop enforcement (`off`) before rollback so subsequent scrapes do not reapply decisions. Use a new checkpoint to revisit earlier records. No deletion, fingerprint changes, lifecycle expiry, or alert enqueue occurs in this command.

## Diagnostics and deployment

The existing Actions artifact now includes the scraper checkpoint, `classification-summary.json`, and the worker startup log for 14 days. It excludes job descriptions, database secrets, and model weights. Worker statistics show classified, cached, incomplete, conflicting, busy, and invalid requests. Source stage events include classification before bulk write. Full probability distributions belong in the local evaluation checkpoint; MongoDB retains selected labels/probabilities, a short evidence context, resolved fields, identity, and bounded rollback fields.

Deploy the backend API/schema changes and the frontend compatibility changes before enabling enforcement. Commit and push the workflow/runtime changes through the normal repository process to run them on Actions. This implementation has not pushed, deployed, published the repository, or changed your hosting plan.

## Verification recorded during implementation

The [structured Workday verification](reports/2026-10-04-structured-workday.md) records complete actual scans for three SOTI descriptions with employer paragraph/list structure retained. All source-backed outcomes match the approved defaults, but the raw model still mislabels the two experienced roles. The current full dry run remains in progress and is audited separately; this sample does not claim whole-run completion or learned-model accuracy.

The [completed full dry-run audit](reports/2026-10-03-full-dry-run.md) records all 4670 attempted sources, timing comparison, native-versus-fallback coverage, source-backed policy corrections and a paired native HTML-cleaning experiment. Escaped ATS HTML is now decoded before model input, internship titles with suffixes retain zero-year defaults, and performance milestones/service bonds cannot become required work years. The paired experiment improved scan completeness but still produced wrong raw employment/experience guesses; base weights remain unvalidated.

The automatic local bootstrap passed 70 targeted Node checks, backend syntax checks over 15348 JavaScript files, and PowerShell parsing. A cached CPU-model run through the resilient supervisor confirmed readiness before child startup, a complete native request, the requested Intern/zero-years category default, and successful child and worker exit. First-install ordering, interrupted extraction repair, failed setup preventing scraping, worker reuse across retries, and unresponsive-worker cleanup are covered by regression tests. The live check reused installed dependencies and weights; a full cold network installation was not repeated. See the [local bootstrap report](reports/2026-10-03-local-laya-bootstrap.md).

The recruitment-policy change passed 176 focused Node tests and 24 source-description checks, 23 Python tests, and seven frontend card-label tests, including temporary MongoDB query/JavaScript parity checks, numeric-zero persistence, source-marked ATS fields, and source-batch provenance through a partial rescrape. The tests cover the user's ten recruitment examples, conflicts where category defaults win, cohort reference-year changes, incidental student/intern mentions, career-break durations, preferred requirements, and checkpoint recovery. Original employer text now survives display normalization, avoiding a second model pass caused by altered input. The [live ABB and American Chase report](reports/2026-10-03-recruitment-policy.md) records actual stored outcomes; test examples are not treated as a learned-model accuracy benchmark.

The [earlier improvement report](reports/2026-10-03-laya-improvements.md) records the preceding source-context changes, guarded outcomes, training tools, and a local run through the normal Node HTTP client. All four American Chase jobs completed within the default timeout and retained the correct source-backed categories; Laya accepted zero decisions and still misread the intern's experience eligibility. The base weights remain unchanged. A synthetic optimizer/save/reload check passed for the approximately 60 MB head, and 2695 actual jobs were prepared for human annotation. Its results predate the user's category-default precedence clarification. No adapter or enforcement release has been activated.

The actual pinned multilingual checkpoint loaded on CPU and processed five illustrative jobs. Several results were uncertain, and a long description exceeded the request deadline. This confirms connectivity and fallback behavior, not the required classification accuracy or production throughput. Shadow mode remains the initial release.

A subsequent [live American Chase comparison](reports/2026-10-02-americanchase.md) produced zero accepted decisions across four actual jobs. It exposed local request timeouts, uncertain graduate-role predictions, and incorrect internship guesses; the guard preserved the baseline. That report records the real outputs and input-provenance limitations rather than claiming an accuracy improvement.

The [follow-up after fixing ATS provenance and zero-experience priority](reports/2026-10-03-americanchase-after-source-fix.md) corrected the graduate role to Full-time Fresher. Laya still produced zero accepted decisions on the four jobs, and fresh CPU requests took 31–43 seconds with a longer diagnostic client wait. Keep enforcement disabled until accuracy and production timeout behavior have been validated.

Focused checks passed: 203 backend policy, ingestion, normalization, filter, and controller tests; two real MongoDB integration checks; seven Python runtime/evaluation tests; and 16 frontend compatibility tests. Backend syntax checks, frontend lint, and the production frontend build passed. The broad existing suites also contained failures in provider/lifecycle/legacy-query cases and three frontend navigation assertions outside this change; they are not reported as green.

For the database check on a fresh machine, run `npm run test:provision-mongo` first to download the test binary separately, then `node --test test/classifiedJobMongo.test.js`. This uses a temporary local database and does not read application database credentials.
