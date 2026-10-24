# Local description generation on CPU

[LFM2.5-1.2B-Instruct QAD Q4_0](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF/blob/430bea1a9fa4d973ce789c15f15e9ed214846f4f/LFM2.5-1.2B-Instruct-QAD-Q4_0.gguf) is the production description model. Its immutable revision, 695,755,488-byte artifact, SHA-256 and llama.cpp b11146 CPU runtime are pinned in [model.json](model.json). The worker verifies pinned assets before startup. Generation runs on the Actions runner without a paid inference API.

Policy `job-description-fact-plan-v15` restores the earlier compact fact-plan protocol. The model selects bounded source-fact decisions instead of generating rewritten prose. The renderer organizes the original facts into sections and retains employer wording, numbers, conditions and required versus preferred scope. This produces source-preserving structured descriptions; it does not substantively paraphrase every job. Missing employer information is never invented. The former evidence-text, source-section and bounded-edit protocols remain available to explicit callers and regression tests.

Preflight assessment and fact-plan validation reject ambiguous assignments or unsuitable sources. Rejected cases retain their employer description. Automated checks do not establish semantic correctness; review pipeline samples against the original source.

Accepted sections become Markdown in description, using the existing escaped heading/paragraph/list renderer. Original sourceDescription, source hashes, employer fields and classification fields remain preserved. Classification prefers a validated current rewrite and otherwise uses the original source. Rejected, truncated or timed-out individual rewrites retain that source, record warnings, and let the pipeline continue. Worker crashes, code errors and database failures remain fatal.

## Actions budgets and resume

The workflow uses **one GitHub job, one model server, four CPU threads and four concurrent rewrite requests**, matching the earlier LFM workflow. Each request has an 8,192-token context; four slots allocate 32,768 context tokens in total. The prompt-cache cap remains 128 MiB. Compact output starts at 768 tokens and can retry truncation once up to 1,536 tokens, bounded by context headroom. Both attempts share a 180-second request deadline.

JOB_DESCRIPTION_REWRITE_CPU_THREADS and JOB_DESCRIPTION_REWRITE_CONCURRENCY are capped at available CPUs up to four. Local callers still default to one request unless concurrency is explicitly enabled. Pipeline throughput must be measured on the actual runner; the model rollback does not guarantee that every queued job will publish within five hours.

Scraping, generation and classification run in separate workflows. Generation has a 350-minute job limit, a 315-minute step limit and a default 18,000-second total runtime budget including setup. Cleanup retains two minutes before the job deadline. JOB_DESCRIPTION_REWRITE_BUDGET_SECONDS overrides the total budget within that deadline; JOB_DESCRIPTION_REWRITE_MODE=off disables generation. An empty queue skips model cache restoration and startup.

A normal rewrite budget stop completes the pipeline stage and permits classification to continue with pending descriptions using their employer source. The summary still records budgetExhausted and interrupted work. Explicit cancellation remains incomplete; nonzero exits, worker/code/database errors and stale guarded writes remain failures. This does not override a GitHub job timeout or external cancellation.

The MongoDB queue reader materializes eight jobs per short indexed query and advances by _id. Each query finishes before inference; no database cursor remains open during multi-minute rewrites. Failed page reads still propagate as database errors. Source hashes, attempt counts and guarded updates retain the durable queue behavior. Interrupted work stays pending; transient item failures retry after one hour, up to three attempts. A changed source displays the latest employer text until its replacement passes. Model/policy changes do **not** automatically requeue published descriptions, unchanged historical records or old skipped records.

## Cache and diagnostics

LFM uses separate Actions keys for immutable assets and accepted fact plans. The validated cache remains in .cache/description-rewrites, isolated under `description-lfm12b-rewrites` policy v15 keys. The request signature binds the pinned model, policy, protocol, messages and schema. Compact decisions may be reused for equivalent prompts, while source facts and metadata are reconstructed and revalidated against each job's current input. Qwen prose and earlier v11 decision caches are not restored by these workflow keys. Only accepted complete outputs enter the cache; the in-memory cache is bounded to 128 entries.

Summary artifacts and console results omit source/completion bodies and report configuration, warnings, token use, latency, memory and queue progress. Bounded-edit-specific metrics only apply to callers selecting that protocol.

A separate description-rejections.json artifact contains at most ten rejected examples, capped at 64 KiB, with at most two samples per reason. A new rejection reason can replace a duplicate-reason sample when the set is full. Bounded raw completion previews survive partial JSON parsing and incomplete streams; failing section/item details are included when available. It excludes exception messages and configuration objects. The summary contains reason counts and the sample count, not those text excerpts. These examples follow the existing 14-day Actions artifact retention and repository access rules.

The generic publishing filter rejects missing, blank and empty-HTML employer descriptions before persistence. Historical empty-description records are hidden from public lists, detail pages, saved-job results and counts. An explicitly empty source cannot be replaced with generated display text. Scraper diagnostics retain filteredEmptyDescription, and raw dry-run captures remain available for inspection.

## Validation status and optional tools

The supplied Qwen v14 run recorded 47 published, 532 failed and 47 skipped results before exhausting its five-hour budget. The LFM rollback restores its earlier model, compact protocol, output limit, request deadline and four-slot workflow, while retaining newer queue paging, guarded writes, diagnostics and normal-budget handoff behavior. Policy v15 isolates the rollback caches. Native inference and full-queue capacity are deferred to pipeline validation; local tests and downloads were stopped at the user's request. See [BENCHMARK.md](BENCHMARK.md) for historical measurements.

Existing commands remain descriptions:preview (queue count), descriptions:rewrite (queue publication), and descriptions:benchmark (20 source jobs, no MongoDB). The optional native smoke test is test/qwenDescriptionWorker.integration.js; it requires predownloaded verified assets through DESCRIPTION_SMOKE_ASSET_DIR. The optional one-versus-four-slot comparison is separate from production defaults. Do not run these locally unless requested.

The full dry-run benchmark defaults to --model 9000 and the configured production client. Local source/output reports and resumable evaluations reject changed model/policy/source identities. Experimental trial prompting is documented separately in [TRIAL.md](TRIAL.md); it is not the production publication protocol. Windows speed and earlier model results do not establish Ubuntu throughput.
