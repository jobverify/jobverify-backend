# Qwen description rewriting on CPU

The configured description rewriter uses **Qwen3.5-9B Q5_K_M**, with immutable model/runtime checksums in [model.json](model.json). Policy v12 generates sections with verbatim source evidence and conservative publication checks. The initial workflow uses four CPU threads, one active request, an 8,192-token context, 2,048 initial output tokens, one bounded retry up to 4,096 tokens, a shared 600-second request deadline and a 128 MiB prompt cache. No local tests or inference were run for this migration. Quality, throughput and peak memory remain pending GitHub pipeline validation.

## Historical full local dry run

The 11 October 2026 dry run used an earlier checkpoint with four CPU threads, one model slot and an 8,192-token context. These results do not measure Qwen or the current section-generation protocol. The workspace report is `artifacts/full-description-dry-run-2026-10-11-c10/REPORT.md`.

- 42,125 raw jobs, 42,082 unique jobs.
- 38,757 nonempty descriptions; 3,325 jobs lacked descriptions.
- 38,713 model requests; the model stage took approximately 6 hours 15 minutes.
- 28,414 outputs passed automated checks; 10,343 retained their employer source.

These are local observations, not measured GitHub Actions capacity. Automated acceptance did not establish semantic correctness: manual review found section assignment errors in accepted drafts. The production validator continues to reject unsupported assignments and preserve required versus preferred scope; manual review of samples remains necessary.

The generic publishing path now excludes empty descriptions. Raw dry-run snapshots remain available as diagnostic evidence, including rejected entries.

## Production behavior and reproduction

The rewrite workflow is separate from scraping. It has a 350-minute job limit, a 315-minute generation step limit and a five-hour default total runtime budget. Pending source-hash work survives interruption and resumes on later runs. Validated prose is reused only when the model, prompt and complete source signature match. Pipeline stage controls determine handoffs; individual generation rejections retain the source and do not fail the stage.

Run a database-free benchmark with 20 representative source descriptions:

```text
npm run descriptions:benchmark -- --input /path/to/20-source-jobs.json --output /path/to/report.json
```

Resume requires unchanged input, model, runtime, platform and policy. A model switch invalidates old cache signatures and benchmark checkpoints. The full dry-run benchmark defaults to the configured Qwen checkpoint (`--model 9000`); the 350M LFM variant remains an explicitly selected historical comparison option. The command above was not executed for this migration.

See [runtime and publishing details](README.md) and [admin setup and pipeline checks](CONTROLS.md).
