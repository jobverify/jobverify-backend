# LFM description organization on CPU

The configured description rewriter uses **LFM2.5-1.2B-Instruct QAD Q4_0**, with immutable model/runtime checksums in [model.json](model.json). The renderer preserves employer statements; the model selects compact fact categories and an overview reference. It does not generate replacement employer facts. The 21 October 2026 model switch was not tested locally; measurements for this checkpoint are pending pipeline validation.

## Historical full local dry run

The 11 October 2026 dry run used the previous checkpoint with four CPU threads, one model slot and an 8,192-token context. These results do not measure the currently configured 1.2B model. The workspace report is `artifacts/full-description-dry-run-2026-10-11-c10/REPORT.md`.

- 42,125 raw jobs, 42,082 unique jobs.
- 38,757 nonempty descriptions; 3,325 jobs lacked descriptions.
- 38,713 model requests; the model stage took approximately 6 hours 15 minutes.
- 28,414 outputs passed automated checks; 10,343 retained their employer source.

These are local observations, not measured GitHub Actions capacity. Automated acceptance did not establish semantic correctness: manual review found section assignment errors in accepted drafts. The production validator continues to reject unsupported assignments and preserve required versus preferred scope; manual review of samples remains necessary.

The generic publishing path now excludes empty descriptions. Raw dry-run snapshots remain available as diagnostic evidence, including rejected entries.

## Production behavior and reproduction

The rewrite workflow is separate from scraping. It has a 350-minute job limit, a 315-minute generation step limit and a five-hour default total runtime budget. Pending source-hash work survives interruption and resumes on later runs. Valid compact decisions can be reused only when the model/prompt signature matches. The admin auto-run switch controls successful scraper completions; manual dispatch remains available when the switch is off.

Run a database-free benchmark with 20 representative source descriptions:

```text
npm run descriptions:benchmark -- --input /path/to/20-source-jobs.json --output /path/to/report.json
```

Resume requires unchanged input, model, runtime, platform and policy. A model switch invalidates old decision signatures and benchmark checkpoints. The benchmark defaults to the configured 1.2B checkpoint (`--model 1200`); the 350M LFM variant remains a local comparison option.

See [runtime and publishing details](README.md) and [admin setup and pipeline checks](CONTROLS.md).
