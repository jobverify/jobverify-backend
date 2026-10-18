# Post-scrape classification with GLiClass

The sole job classification model is `knowledgator/gliclass-edge-v3.0`, pinned to revision `df03993a2ed98e5e4a0d2dd7efbbd105abe874cf` in [gliclass/model.json](gliclass/model.json). The public weights run on CPU; no hosted inference API or paid model is used.

Scrapers save source descriptions and mark new or changed inputs as `postClassification.status: pending`. They do not download or start a classification model. A separate [classification workflow](../.github/workflows/classify-jobs.yml) runs after successful rewriting in the default GitHub chain (or at its configured position in an admin pipeline), reads active MongoDB jobs, classifies the current validated rewritten description with fallback to original employer text, and writes results back using a source snapshot compare-and-set. A source edit during inference rejects the stale result. Owner leases prevent duplicate updates; completed unchanged inputs reuse cached predictions.

The four model labels are **Full-time Experienced**, **Full-time Fresher**, **Intern**, and **Contract**. Full descriptions use overlapping 512-token windows with 64-token overlap. Missing descriptions and descriptions over 262,144 UTF-8 bytes are skipped without claiming complete coverage. Source rules determine public eligibility and numeric experience. Raw GLiClass scores and disagreements remain in `postClassification.result`; these uncalibrated scores are not a measured accuracy percentage. Insufficient source evidence can produce `Unspecified`, and other explicit employment arrangements can produce `Others`.

`shadow` mode (standalone CLI default) records comparisons without making model results authoritative. `policy` mode writes the source-guarded classification and filter fields together. Classification can be retried independently of scraping. Pipeline execution uses `policy` mode. The workflow uses four shards, one CPU thread per worker, a five-hour processing budget per shard, and a six-hour job timeout. This is a configured budget, not a guaranteed completion time for every backlog.

## Local setup

From the backend directory, use Python 3.12 and install the CPU dependencies:

```powershell
python -m pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r classification/gliclass/requirements.txt
python classification/gliclass/download.py .cache/gliclass-model
$env:GLICLASS_MODEL_DIRECTORY = '.cache/gliclass-model'
$env:GLICLASS_CPU_THREADS = '1'
```

The downloader verifies the pinned model files against SHA-256 checksums. Set `GLICLASS_PYTHON` when using a dedicated Python executable. The existing local model and Python runtime under the workspace's `artifacts/gliclass-local-2026-10-10` can also be reused by setting those two paths.

With `MONGO_URI` configured, `npm run classify:jobs` starts the separate classification stage. **This command writes classification metadata to MongoDB even in shadow mode.** It is not a read-only dry run. It defaults to shadow; set `POST_SCRAPE_CLASSIFICATION_MODE=policy` to publish source-guarded fields. No production database run is part of the model cleanup.

| Setting | Default | Purpose |
| --- | --- | --- |
| `GLICLASS_MODEL_DIRECTORY` | Required locally; `.cache/gliclass-model` in Actions | Verified local model files |
| `GLICLASS_PYTHON` | `python` | Python executable |
| `GLICLASS_CPU_THREADS` | `1` | CPU inference threads |
| `POST_SCRAPE_CLASSIFICATION_MODE` | `shadow` | `shadow` comparisons or `policy` updates |
| `CLASSIFICATION_SHARD` | `0` | Worker partition |
| `CLASSIFICATION_SHARD_COUNT` | `1` locally; `4` in Actions | Total partitions |
| `CLASSIFICATION_BUDGET_SECONDS` | `18000` | Processing budget per worker |
| `CLASSIFICATION_SUMMARY_FILE` | `.cache/scraper-actions/classification-<shard>.json` | Progress summary |

Description rewriting is a separate feature with its own model and workflow; classification prefers a current, validated rewrite and otherwise reads the original employer content. Its input hash includes the selected content and rewrite identity. See [Pipeline execution](../docs/PIPELINE.md). [Post-scrape tests](../test/postScrapeClassification.test.js) exercise partitioning, cache reuse, failure recovery, and source-change rejection using a temporary local MongoDB and fake inference responses.
