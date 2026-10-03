# Local job-description rewriting

GitHub Actions scrapes and runs Laya first, stops Laya, then starts a single CPU-only llama.cpp worker. There is no inference API or separate service. The Qwen2.5-1.5B-Instruct Q4_K_M checkpoint and CPU release are pinned in [model.json](model.json), downloaded by immutable revision/release, verified with SHA-256, and cached by Actions. The model file is about 1.12 GB; inference needs additional RAM.

## Storage and source isolation

New jobs and changed employer source facts queue a rewrite during saveToDB. Existing unchanged jobs are marked baseline when first observed and are never backfilled. The hash includes source description, original title, employer, location, salary and supplied qualification/source fields, ignoring scrape timestamps and display text. Published rewrites survive unchanged scrapes even when rewriting is disabled. On a source change, the latest employer description replaces the previous rewrite immediately and remains visible until validation succeeds.

MongoDB description contains the visible description; descriptionFormat is plain or markdown. sourceDescription preserves the original scrape; sourceContentHash and descriptionRewrite record queue state, attempts, model revision, runtime tag, policy version, timings and failure reasons. Laya, skill/experience extraction, public job-type decisions and classification exports use the preserved source. Public API responses omit source and rewrite diagnostics. Existing records without sourceDescription retain legacy fallback behavior.

The generator returns constrained JSON sections and supporting verbatim evidence for every paragraph/bullet. The publication policy rejects malformed or truncated output, invalid evidence, altered numeric relationships/negation, promoted preferred requirements, unsupported claim tokens and repetition. Required/preferred sections and individual source requirement statements cannot silently disappear. Plain and HTML section headings retain their required/preferred scope. Content-bearing terms must appear in the supporting excerpt; novel technology names are rejected. Numerical and negated statements are copied verbatim. These checks are conservative proxies, not a factual-entailment guarantee. The model is told to ignore instructions embedded in scraped text.

Accepted sections are serialized into description with a small Markdown block format. The frontend renders only headings, paragraphs and bullets as escaped React text, never HTML or arbitrary Markdown links.

## Workflow controls

Actions repository variables:

- JOB_DESCRIPTION_REWRITE_MODE: publish (workflow default) or off.
- JOB_DESCRIPTION_REWRITE_BUDGET_SECONDS: 1200 seconds by default. The deadline also leaves two minutes before the workflow's 150-minute timeout, including model preparation/startup time.
- CPU threads are limited to two by the workflow; the worker permits at most four locally.

There is one model slot and one generation request at a time. Each request has a 180-second timeout and an output token limit; long output may fail rather than be published incomplete. The 8192-token context has context shifting disabled. Brief employer sources stay brief; the prompt targets 800–1200 words only for detailed sources that support it. There is no minimum word-count padding. Sources under 25 words or exceeding the input byte bound are skipped.

Pending jobs resume on later runs. Failed jobs retry after one hour, up to three attempts per source version. Changing the source resets attempts. Interrupted/deadline-expired work stays pending. Atomic publication matches the active job's current source hash, pending/failed state and attempt count, so stale generation cannot overwrite a changed source. A remaining Laya listener prevents a second model from starting. This stage cannot send job alerts.

Diagnostics (.cache/scraper-actions/description-summary.json and description-worker.log) are uploaded with scraper artifacts for 14 days. They omit source text, generated completions and connection strings. Validation failures retain the source description. Worker crashes do not fail an otherwise successful scrape.

## Local commands

Use Node 24 and the backend's existing npm dependencies. Linux/Windows x64 are supported. Set MONGO_URI through the existing environment loader and JOB_DESCRIPTION_REWRITE_MODE=publish to apply:

    npm run descriptions:preview
    npm run descriptions:rewrite

Preview only counts eligible queued jobs and never downloads a model, generates text or writes MongoDB. Applying uses only the queue; there is no backfill command. To disable future rewrites, set mode off. Existing accepted descriptions remain visible.

Benchmark without a database or publication:

    npm run descriptions:benchmark -- --input /path/to/20-source-jobs.json --output /path/to/report.json

The input must be a JSON array of exactly 20 representative scraped jobs. Reports checkpoint each case; add --resume to continue an interrupted report with matching source hashes/model/platform. Completed payloads are revalidated against the current policy and generation-policy hashes identify mixed prompt revisions. Reports include runtime, worker peak memory where measurable, completion status, validation reasons, generated sections/evidence, word count and average sentence length. Inspect accepted paragraphs against employer originals to assess factual preservation/readability. Report contents include employer text and should stay local or in private artifacts. Local Windows throughput does not establish Ubuntu Actions throughput. The [20-job pilot](BENCHMARK.md) produced zero accepted rewrites on the local Windows host: 18 timeouts and two factual-validation failures. The model/settings require further tuning and measurement before suitable rewrite quality can be claimed.

## Publishing limitation

Rewriting improves organization and readability; more words do not guarantee AdSense eligibility. Google's [replicated-content policy](https://support.google.com/publisherpolicies/answer/11190248?hl=en) includes rewriting without added value and automatic content without review/curation. Automated checks cannot establish originality or every sentence's accuracy. Original editorial value and site-level publishing quality remain separate concerns.
