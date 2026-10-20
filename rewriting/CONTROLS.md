# Description rewriting in the pipeline

Use **Admin ? Scrapers ? Configure Pipeline Execution** to enable/reorder stages and trigger execution. The old rewrite-only controls and repository auto-run variable are retired.

See [Pipeline execution](../docs/PIPELINE.md) for setup, GitHub chaining, Local caches, processing outcomes, API compatibility and rollout. Direct GitHub Rewrite starts Rewrite ? Classification. Admin runs use their saved stage configuration.

GitHub rewriting stays in one standard Linux job. `JOB_DESCRIPTION_REWRITE_CONCURRENCY=4` allows four descriptions to run concurrently through one shared model server. Generation and prompt processing share a four-thread CPU configuration; parallelism and thread counts are capped at the available CPUs, up to four. Each request retains the full 8,192-token context. Local callers default to one request unless concurrency is explicitly enabled.

One producer reads the MongoDB cursor, and bounded workers overlap generation and guarded updates. The same source hashes and validation rules apply to every publication. Cancellation leaves unfinished descriptions queued, and all scheduled work settles before the model or database is closed. The final summary records configured parallelism and peak concurrent work. The existing five-hour processing budget and cleanup allowance remain in place.
