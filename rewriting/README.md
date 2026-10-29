# Local description generation on CPU

[LFM2.5-1.2B-Instruct QAD Q4_0](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF/blob/430bea1a9fa4d973ce789c15f15e9ed214846f4f/LFM2.5-1.2B-Instruct-QAD-Q4_0.gguf) is the production description model. Its immutable revision, 695,755,488-byte artifact, SHA-256 and llama.cpp b11146 CPU runtime are pinned in [model.json](model.json). The worker verifies pinned assets before startup. Generation runs on the Actions runner without a paid inference API.

Policy `job-description-prose-v18` uses actual LLM rephrasing of scraped employer text. The model improves wording, headings and bullets using only supplied source information. Production has no application-level input/output word, character, byte or fact-count ceiling, and no minimum source word count. Blank or markup-only source remains ineligible. The older fact-plan, evidence-text, source-section and bounded-edit protocols remain available to explicit callers and regression tests; their limits do not govern production prose rewriting.

The client cleans source markup while preserving comparison operators, numbers and text. It counts the actual local chat template with the model tokenizer and reserves room for output inside each 8,192-token context. Each generation can use all remaining context headroom, rather than a fixed 768-token or 1,536-token prose ceiling. Prompts occupying more than a quarter of the context are proactively split near paragraph, sentence or word boundaries; token-truncated output also triggers splitting. Splits preserve the entire source and Unicode characters. The nearest recognized source heading supplies section context to later fragments. A source-relative stream guard rejects unsupported repeated runs without imposing a general output-length ceiling. All chunks share the remaining workflow budget; production has no separate 180-second description deadline. Explicit callers can still request a shorter timeout.

Only a complete sequence of rewritten chunks can publish. Final validation verifies the source hash and reconstructs the entire cleaned source from the chunks, rejecting missing suffixes. Conservative checks match individual source statements, allowing statement reordering, coordinated bare duties becoming bullets, unambiguous thousands separators, number spelling zero through nineteen and a small set of equivalent phrases. Numeric subject/value/unit/comparator associations (including currency symbols, percentages and negative values), substantive token order, actors, modal commitments, conditions, negation and inherited qualification scope must survive. Physical chunks split inside a sentence rejoin with a space instead of inventing a paragraph boundary. Missing statements and added claims are rejected. Unrecognized paraphrases may be rejected even when a person would consider them equivalent. These lexical checks do not prove semantic equivalence, complete factual retention or absence of hallucination; representative native output still needs quality review. No perfect-coverage or zero-added-claims score is asserted for prose.

Accepted prose becomes Markdown in description through the existing escaped renderer. Original sourceDescription, hashes and employer/filter fields are preserved. Canceled or incomplete work cannot replace the visible source. Physical model context, workflow time, memory and database document constraints still apply. Long documents may require many sequential generations and actual prose rephrasing costs substantially more inference than compact category decisions.

## Actions budgets and resume

The workflow uses **one GitHub job, one model server, four CPU threads and four concurrent rewrite requests**. Each slot has an 8,192-token model context. The prompt-cache cap remains 128 MiB. Context size bounds each individual request, not the total description length; sequential chunks allow aggregate input and output beyond that window.

JOB_DESCRIPTION_REWRITE_CPU_THREADS and JOB_DESCRIPTION_REWRITE_CONCURRENCY are capped at available CPUs up to four. Local callers still default to one request unless concurrency is explicitly enabled. Pipeline throughput must be measured on the actual runner; rephrasing does not guarantee that every queued job will publish within the workflow budget.

Scraping, generation and classification run in separate workflows. Generation has a 350-minute job limit, a 345-minute step limit and a default 19,800-second (5 hours 30 minutes) total runtime budget including setup. Cleanup retains two minutes before the job deadline. JOB_DESCRIPTION_REWRITE_BUDGET_SECONDS overrides the total budget within that deadline; JOB_DESCRIPTION_REWRITE_MODE=off disables generation. An empty queue skips model cache restoration and startup.

A normal rewrite budget stop completes the pipeline stage and permits classification to continue with pending descriptions using their employer source. The summary still records budgetExhausted and interrupted work. Explicit cancellation remains incomplete; nonzero exits, worker/code/database errors and stale guarded writes remain failures. This does not override a GitHub job timeout or external cancellation.

Every startup readiness slot must pass validation before production processing begins. A quality rejection records `model_quality_unavailable`, `qualityStopped: true`, `handoffReady: true` and `processingComplete: false`; no production attempts are consumed and classification can continue. Genuine execution failures and cancellation retain priority over that quality handoff.

The MongoDB queue reader materializes eight jobs per short indexed query and advances by _id. Each query finishes before inference; no database cursor remains open during multi-minute rewrites. Failed page reads still propagate as database errors. Interrupted work stays pending; transient item failures retry after one hour, up to three attempts. Deterministic validation failures have no scheduled identical retry. Failed records with a recorded different policy version become eligible and receive a fresh attempt budget through a guarded metadata repair. Published descriptions, baseline historical records and skipped records are not automatically requeued. A changed source displays the latest employer text until its replacement passes.

## Cache and diagnostics

LFM uses separate Actions keys for immutable assets and accepted prose rewrites. Validated outputs are cached in .cache/description-rewrites under policy v18 with the source-cache-v2 protocol. Identity includes the pinned model, full policy configuration and exact cleaned prompt text with appended source facts; random worker aliases do not invalidate persistent cache entries. Identical effective sources can reuse content across job records, but every response is rebound to the requesting input hash and revalidated before a guarded write. Validated contiguous source chunks are checkpointed with exact offsets and inherited headings, revalidated on resume and reused without exposing partial descriptions. Old policy and fact-plan caches cannot become prose output. Memory caching is bounded to 128 entries per cache; there is no per-description cache text ceiling.

Concurrent identical sources share one generation. Each caller retains its own deadline and cancellation; the underlying request is aborted when no callers remain. Usage and generation counts are attributed once. `cacheSource` distinguishes memory, disk and in-flight reuse. `cacheMode: 'refresh'` is an explicit client option for measuring fresh generation; it bypasses cached/partial output and in-flight sharing while storing newly validated results.

Summary artifacts and console results omit source/completion bodies and report configuration, warnings, token use, latency, memory and queue progress. Per-job telemetry includes source offsets, tokenizer counts, finish/split reasons and durations for at most 32 generations, plus aggregate usage and reused chunk counts. Bounded-edit-specific metrics only apply to callers selecting that protocol.

A separate description-rejections.json artifact contains at most ten rejected examples, capped at 64 KiB, with at most two samples per reason. Samples identify probe versus production phase; production failures can replace same-reason probe samples. A new rejection reason can replace a duplicate-reason sample when the set is full. Bounded raw completion previews survive prose validation, partial JSON parsing and incomplete streams; precise failing statement details are included when available. It excludes exception messages and configuration objects. The summary contains reason counts and the sample count, not those text excerpts. These examples follow the existing 14-day Actions artifact retention and repository access rules.

The generic publishing filter rejects missing, blank and empty-HTML employer descriptions before persistence. Historical empty-description records are hidden from public lists, detail pages, saved-job results and counts. An explicitly empty source cannot be replaced with generated display text. Scraper diagnostics retain filteredEmptyDescription, and raw dry-run captures remain available for inspection.

## Validation status and optional tools

Native prose inference quality and full-queue capacity have not yet been established for v18. Local HTTP tests verify transport, chunking, validation and publication behavior using mock completions. Native benchmark/local evaluation reports preserve original prose rejection reasons and previews; their shared policy identity includes the prose client and validator. Existing historical model results do not establish the new prose throughput. See [BENCHMARK.md](BENCHMARK.md) for historical measurements.

Existing commands remain descriptions:preview (queue count), descriptions:rewrite (queue publication), and descriptions:benchmark (20 source jobs, no MongoDB). The optional native smoke test is test/qwenDescriptionWorker.integration.js; it requires predownloaded verified assets through DESCRIPTION_SMOKE_ASSET_DIR. The optional one-versus-four-slot comparison is separate from production defaults. Do not run these locally unless requested.

## Three-second latency target

`descriptions:latency` compares one versus four concurrent requests on the actual native runtime, without MongoDB or publication:

```powershell
npm run descriptions:latency -- --input ../artifacts/rewrite-run-1418e50a/native-benchmark-input.json --output ../artifacts/rewrite-latency-20261029/native-report.json --target-ms 3000 --budget-seconds 1800
```

Each configuration starts one worker, disables idle unloading, warms it once, then measures fresh complete rewrites, disk-cache replay and memory-cache replay separately. Fresh measurements explicitly bypass result caches and request coalescing; cached phases replay only accepted fresh cases. Reports retain acceptance/rejection counts, model requests, p50/p95/max request duration, throughput and accepted requests under the target. `sampleMeetsTarget` requires every fresh source in that sample to be accepted within the target. Startup, asset preparation and warmup are reported separately. The target never truncates output, weakens validation or becomes a three-second cancellation limit.

Verified local model/runtime assets are required by default; missing assets produce a blocked report without a download attempt. Use `--assets-dir` for another local cache, or explicitly opt into `--download-assets`. Hardware results from fixture tests are not native performance evidence. Actual v18 native latency remains unverified until this command can run with the model assets.

Request latency excludes recording the benchmark artifact; aggregate throughput includes that I/O. Warmup failures retain their request counts and bounded diagnostics. `nativeInferenceAttempted` records that generation was attempted, while `nativeInferenceExecuted` is `null` when an attempted warmup fails without observed output, `true` when output is observed, and `false` when missing assets prevent any attempt.

For a GPU-capable machine, supply a compatible llama.cpp b11146 build and its binary SHA-256:

```powershell
npm run descriptions:latency -- --input jobs.json --gpu-layers all --binary C:/runtimes/llama-server.exe --binary-sha256 YOUR_BINARY_SHA256 --assets-dir .cache/description-rewriter
```

GPU layer settings accept `0`, a nonnegative layer count, `all` or `auto`. A positive/automatic offload request cannot silently select the pinned CPU package through the CLI; a custom binary and checksum are required. The binary checksum verifies the caller-selected file, not GPU availability or compatibility. Confirm actual offload in the worker log before interpreting a result as GPU performance. No GPU driver, runtime or remote service is installed automatically.

Production/local rewriting accepts `JOB_DESCRIPTION_REWRITE_GPU_LAYERS`, `JOB_DESCRIPTION_REWRITE_BINARY` and `JOB_DESCRIPTION_REWRITE_BINARY_SHA256` as explicit opt-in settings; defaults remain CPU. A single worker stays loaded throughout its run and prompt-prefix reuse is enabled. GitHub still defaults to four requests; set the repository variable `JOB_DESCRIPTION_REWRITE_CONCURRENCY` to `1` only after comparing latency and throughput on that runner.

The full dry-run benchmark defaults to --model 9000 and the configured production client. Local source/output reports and resumable evaluations reject changed model/policy/source identities. Experimental trial prompting is documented separately in [TRIAL.md](TRIAL.md); it is not the production publication protocol. Windows speed and earlier model results do not establish Ubuntu throughput.
