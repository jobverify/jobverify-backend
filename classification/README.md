# Post-scrape classification with GLiClass

The sole job classification model is `knowledgator/gliclass-edge-v3.0`, pinned to revision `df03993a2ed98e5e4a0d2dd7efbbd105abe874cf` in [gliclass/model.json](gliclass/model.json). The public weights run on CPU; no hosted inference API or paid model is used.

Scrapers save source descriptions and mark new or changed inputs as `postClassification.status: pending`. They do not download or start a classification model. A separate [classification workflow](../.github/workflows/classify-jobs.yml) runs after successful rewriting in the default GitHub chain (or at its configured position in an admin pipeline), reads active MongoDB jobs, classifies the current validated rewritten description with fallback to original employer text, and writes results back using a source snapshot compare-and-set. A source edit during inference rejects the stale result. Owner leases prevent duplicate updates; completed unchanged inputs reuse cached predictions.

The four model labels are **Full-time Experienced**, **Full-time Fresher**, **Intern**, and **Contract**. Full descriptions use overlapping 512-token windows with 64-token overlap. Missing descriptions and descriptions over 262,144 UTF-8 bytes are skipped without claiming complete coverage. Source rules determine public eligibility and numeric experience. Raw GLiClass scores and disagreements remain in `postClassification.result`; these uncalibrated scores are not a measured accuracy percentage. Insufficient source evidence can produce `Unspecified`, and other explicit employment arrangements can produce `Others`.

`shadow` mode (standalone CLI default) records comparisons without making model results authoritative. `policy` mode writes the source-guarded classification and filter fields together. Classification can be retried independently of scraping. Pipeline execution uses `policy` mode. The workflow uses four shards on separate runners, requests four CPU threads per worker, and caps the effective count at the available CPU affinity and four threads. Its processing budget is five hours per shard with a six-hour job timeout. This is a configured budget, not a throughput guarantee; thread tuning needs measurement on the target runner.

## Diagnostics and skipped input

Every assigned job produces a row in `classification-<shard>.ndjson`, uploaded with its JSON summary. Rows contain job ID, company, short title, source identity, selected-description origin, input byte count, status and reason. They do not contain description bodies or evidence excerpts. Completed rows also report source-policy/public/model labels, agreement, an explicitly uncalibrated model score and fresh-inference measurements where available. Cached predictions contribute category counts but never reuse historical timing or RAM as measurements of the current run.

Missing input is recorded as `missing_description`; input above 262,144 UTF-8 bytes is `oversized_description`. Each reason has a separate summary counter. Use the diagnostic IDs to repair the employer source or scraper extraction, then run classification again: changed valid input is classified normally. Empty input cannot receive an invented label, and oversized input is not silently truncated. This change does not repair or requeue production records by itself.

Summary reports include resolved categories, public labels written in policy mode, model comparisons, uncertain decisions, source-quality issues, description origins, request counts, inference CPU/wall time, bounded latency buckets and worker peak RSS. Description origins cover all assigned inputs; category counters cover completed and cached decisions. Source-policy `Unspecified` is retained separately from public-label normalization; no category or confidence rules change. Uncertainty follows existing source-policy uncertainty or `Unspecified`, not a threshold on uncalibrated model scores. CPU usage is expressed as average CPU cores used during requests with measured CPU/wall time, not whole-host utilization. Latency buckets are mutually exclusive upper-bound ranges, not exact percentile measurements. Peak RSS includes Linux's OS process high-water mark or Windows' peak working set; other platforms retain the largest current observation.

The aggregate uses assigned partitions for `scanned`, with `scanCountBasis: assigned_partitions`. Repeated collection identity reads are reported separately as `identityScans`; four scans of 32,992 identities therefore do not appear as 131,968 classified jobs. Counts describe each worker's assigned records; they are not a point-in-time census if sources change during a run. Aggregate elapsed time is the longest shard processing time, while `workerSeconds` sums shard time. Peak RSS is the largest single-worker observation, with each runner's settings and peak retained under `workers`; separate runner RAM peaks are not summed.

The expected length warning is quiet only while tokenizing the complete document for window construction. Every inference window still passes the existing 512-token length check, with 64-token overlap and full-coverage validation. BPE tokenization cleanup is explicitly disabled when loading and decoding. Other dependency and inference warnings remain visible.

The runtime helper participates in the existing classification and native-prediction fingerprints. This runtime change invalidates older cache identities, so the first subsequent pipeline run can reclassify previously completed jobs; later unchanged runs reuse their results normally. It does not download a different model.

The 22 October 2026 diagnostics and CPU changes have not been tested locally or run through inference, as requested. New regression cases are authored but unexecuted; compatibility, performance and artifact contents remain pending pipeline validation.

## Local setup

From the backend directory, use Python 3.12 and install the CPU dependencies:

```powershell
python -m pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r classification/gliclass/requirements.txt
python classification/gliclass/download.py .cache/gliclass-model
$env:GLICLASS_MODEL_DIRECTORY = '.cache/gliclass-model'
$env:GLICLASS_CPU_THREADS = 'auto'
```

The downloader verifies the pinned model files against SHA-256 checksums. Set `GLICLASS_PYTHON` when using a dedicated Python executable. The existing local model and Python runtime under the workspace's `artifacts/gliclass-local-2026-10-10` can also be reused by setting those two paths.

With `MONGO_URI` configured, `npm run classify:jobs` starts the separate classification stage. **This command writes classification metadata to MongoDB even in shadow mode.** It is not a read-only dry run. It defaults to shadow; set `POST_SCRAPE_CLASSIFICATION_MODE=policy` to publish source-guarded fields. No production database run is part of the model cleanup.

| Setting | Default | Purpose |
| --- | --- | --- |
| `GLICLASS_MODEL_DIRECTORY` | Required locally; `.cache/gliclass-model` in Actions | Verified local model files |
| `GLICLASS_PYTHON` | `python` | Python executable |
| `GLICLASS_CPU_THREADS` | `auto` locally; `4` requested in Actions | Positive integer or `auto`; capped at available CPUs and four |
| `POST_SCRAPE_CLASSIFICATION_MODE` | `shadow` | `shadow` comparisons or `policy` updates |
| `CLASSIFICATION_SHARD` | `0` | Worker partition |
| `CLASSIFICATION_SHARD_COUNT` | `1` locally; `4` in Actions | Total partitions |
| `CLASSIFICATION_BUDGET_SECONDS` | `18000` | Processing budget per worker |
| `CLASSIFICATION_SUMMARY_FILE` | `.cache/scraper-actions/classification-<shard>.json` | Progress summary |
| `CLASSIFICATION_DIAGNOSTICS_FILE` | Summary filename with `.ndjson` extension | Per-job outcomes without description bodies |

Description rewriting is a separate feature with its own model and workflow; classification prefers a current, validated rewrite and otherwise reads the original employer content. Its input hash includes the selected content and rewrite identity. See [Pipeline execution](../docs/PIPELINE.md). [Post-scrape tests](../test/postScrapeClassification.test.js) exercise partitioning, cache reuse, failure recovery, and source-change rejection using a temporary local MongoDB and fake inference responses.
