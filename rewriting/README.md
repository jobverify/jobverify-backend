# Local description generation on CPU

[Qwen3.5-9B Q5_K_M](https://huggingface.co/unsloth/Qwen3.5-9B-GGUF/blob/dcb5858fb5302827076259ceafff1690cb56d736/Qwen3.5-9B-Q5_K_M.gguf) is the production description rewriting model. Its immutable revision, 6,577,841,376-byte artifact, SHA-256 and llama.cpp b11146 CPU runtime are pinned in [model.json](model.json). The worker verifies the pinned assets before startup. Generation runs locally on the Actions runner without a paid inference API.

Policy v12 generates a coherent overview and source-supported sections: responsibilities, required qualifications, required skills, preferred qualifications/skills, employment and application details. The prompt retains source headings and line boundaries, supplies employer metadata, and treats scraped content as quoted data. Every generated item must include a verbatim evidence excerpt. Thinking is disabled in the server template and completion requests. There is no word-count padding or invention of missing employer information.

Validation checks evidence, unsupported terminology, numeric relationships, negation, conditions, required versus preferred scope, repetition and coverage of parsed requirements and responsibilities. Numeric, negated and conditional source statements retain their exact wording. Factual terms retain their relative order to reject reversed relationships. These conservative checks can reject useful paraphrases, and they do not prove semantic entailment. Review pipeline samples against their original source before judging quality.

Accepted sections become Markdown in description, using the existing escaped heading/paragraph/list renderer. Original sourceDescription, source hashes, employer fields and classification fields remain preserved. Classification prefers a validated current rewrite and otherwise uses the original source. Rejected, truncated or timed-out individual rewrites retain that source, record warnings, and let the pipeline continue. Worker crashes, code errors and database failures remain fatal.

## Actions budgets and resume

The workflow uses **one GitHub job, one model server, four CPU threads and one active rewrite request**. Its context is 8,192 tokens, with a 128 MiB prompt-cache cap. Output starts at 2,048 tokens. A token-truncated response can retry once at up to 4,096 tokens. Prompt formatting/token counting and both attempts share a 600-second request deadline. The local template/tokenizer measures prompt length; output is capped to the remaining context with a 64-token reserve. Sources with less than 256 tokens of output headroom are skipped without inference.

JOB_DESCRIPTION_REWRITE_CPU_THREADS and JOB_DESCRIPTION_REWRITE_CONCURRENCY select thread and request counts, each capped at available CPUs up to four. Higher concurrency is an explicit comparison option, not the initial Qwen workflow setting. It increases memory/context allocation and needs separate measurement on the target runner.

Scraping, generation and classification run in separate workflows. Generation has a 350-minute job limit, a 315-minute step limit and a default 18,000-second total runtime budget including setup. Cleanup retains two minutes before the job deadline. JOB_DESCRIPTION_REWRITE_BUDGET_SECONDS overrides the total budget within that deadline; JOB_DESCRIPTION_REWRITE_MODE=off disables generation. An empty queue skips model cache restoration and startup.

The MongoDB source-hash queue survives runner shutdown. Interrupted work stays pending. Transient item failures retry after one hour, up to three attempts. Conditional updates match source hash, active status, previous rewrite status and attempt count. A changed source immediately displays the latest employer text until its replacement passes. Switching models does **not** automatically requeue published descriptions, unchanged historical records, or old skipped records.

## Cache and diagnostics

Qwen has separate Actions keys for immutable assets and validated generated descriptions. The description cache lives in .cache/description-rewrites. Each signature includes the pinned model, protocol, messages/schema and complete input hash. A salary change or changed source structure requires a fresh rewrite; older compact decision caches cannot supply Qwen prose. Disk entries are validated before reuse. Only accepted complete outputs enter the cache, and the in-memory cache is bounded to 128 entries.

Unlike historical numeric decision caches, this cache contains generated employer text and supporting excerpts. Production summary artifacts omit source/completion bodies and report model identity, configuration, warnings, token use, latency, worker memory and queue progress. The cache remains subject to repository Actions access and cache retention settings.

The generic publishing filter rejects missing, blank and empty-HTML employer descriptions before persistence. Historical empty-description records are hidden from public lists, detail pages, saved-job results and counts. An explicitly empty source cannot be replaced with generated display text. Scraper diagnostics retain filteredEmptyDescription, and raw dry-run captures remain available for inspection.

## Validation status and optional tools

No local tests, syntax/lint checks, model download, inference, database writes or workflow dispatch were performed for this migration, at the user's request. Regression cases were authored but remain unexecuted. Pipeline validation must establish native compatibility, acceptance quality, latency, memory use and queue capacity on the 4-vCPU/16-GB runner. Historical results in [BENCHMARK.md](BENCHMARK.md) and [VERIFICATION.md](VERIFICATION.md) do not measure this model or prose protocol.

Existing commands remain descriptions:preview (queue count), descriptions:rewrite (queue publication), and descriptions:benchmark (20 source jobs, no MongoDB). The optional native smoke test is test/qwenDescriptionWorker.integration.js; it requires predownloaded verified assets through DESCRIPTION_SMOKE_ASSET_DIR. The optional one-versus-four-slot comparison is separate from production defaults. Do not run these locally unless requested.

The full dry-run benchmark defaults to --model 9000 and the production section client. Local source/output reports and resumable evaluations reject changed model/policy/source identities. Experimental trial prompting is documented separately in [TRIAL.md](TRIAL.md); it is not the production publication protocol. Windows speed and earlier model results do not establish Ubuntu throughput.
