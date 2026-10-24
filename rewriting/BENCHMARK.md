# Description rewriting on CPU

## Current LFM rollback, policy v15

Production is pinned to **LFM2.5-1.2B-Instruct QAD Q4_0** in [model.json](model.json). It restores the compact fact-plan protocol, four CPU threads, four concurrent requests, an 8,192-token context per slot, 768 initial output tokens, one truncation retry up to 1,536 tokens and a shared 180-second request deadline. The five-hour processing budget remains unchanged. Queue paging, guarded publication and rejection diagnostics remain in place.

The user reports that the earlier LFM deployment processed its queue within five hours. That exact successful run has not been independently verified from the supplied archive. No native inference benchmark completed for this rollback; further local tests and downloads were stopped at the user's request. Validate acceptance and throughput in the GitHub pipeline. A completed workflow can still have failed, skipped or pending jobs.

## Supplied Qwen run, policy v14

Run 40082012050 on 24 October 2026 recorded 23,318 initially queued jobs and 626 completed result rows: 47 published, 532 failed and 47 skipped. It stopped after approximately five hours with 22,692 pending. The attempted counter was 580, consistent with one additional in-flight attempt. The dominant failure was source_words_changed (388). It used four CPU threads but one request slot; median job duration was 34.0 seconds. These are Qwen measurements, not LFM capacity estimates.

## Previous GitHub run, policy v13

Artifact description-rewrite-39826150888-1.zip covers 22 October 2026 17:50:50-22:50:55 UTC, approximately five hours. Of 19,485 queued jobs, 37 were attempted: two published, 34 failed and one remained in flight at the budget stop. Three additional jobs were skipped before generation, leaving 39 completed result rows. Failures comprised 28 token truncations at the 1,024-token cap, three timeouts, two unsupported claims and one changed relationship. The three preflight skips exceeded the source-fact limit.

Generation was approximately 4.3 output tokens/second on a four-thread AMD EPYC 7763 runner. Worker peak RSS was 6.85 GiB, and the worker remained alive at the deadline. CursorNotFound did not recur. The normal five-hour budget nevertheless marked the stage incomplete and blocked classification. Rejection samples contained only early truncations and a null completion preview, preventing inspection of partial JSON and later rejection types.

The v14 changes bound both generated edit count and length, narrow the prompt to job-focused candidates, reject edits that omit source words, retain partial completion previews, diversify rejection samples, and permit classification after a normal budget stop. Pending work remains queued. Throughput improvement and output quality still need measurement in Actions; these changes do not establish whole-queue capacity on four CPU cores.

## Previous GitHub run, policy v12

Artifact description-rewrite-39648222312-1.zip covers 21 October 2026 17:56:51–19:30:19 UTC (21–22 October in Asia/Calcutta), duration 1h33m28s. The runner exposed four CPUs and about 16 GB RAM. Qwen loaded and generated responses at approximately 5.55–6.08 output tokens/second; worker peak RSS was 6.89 GiB. This was not an out-of-memory shutdown.

Of 15,992 queued jobs, 12 were attempted: zero published, seven validation rejections and five ten-minute timeouts. There were 17 generation requests. The terminal exception was MongoServerError code43 CursorNotFound while reading the queue; the worker was still running. The artifact cannot establish why MongoDB invalidated that cursor. The v13 changes close each page query before inference, remove repeated evidence generation, preserve sensitive facts directly, avoid retries predicted to exceed the deadline, and add bounded rejection examples. Do not extrapolate the first twelve jobs into a guaranteed whole-queue completion time.

## Historical full local dry run

The 11 October 2026 dry run used an earlier checkpoint with four CPU threads, one model slot and an 8,192-token context. These results do not measure Qwen or the current section-generation protocol. The workspace report is `artifacts/full-description-dry-run-2026-10-11-c10/REPORT.md`.

- 42,125 raw jobs, 42,082 unique jobs.
- 38,757 nonempty descriptions; 3,325 jobs lacked descriptions.
- 38,713 model requests; the model stage took approximately 6 hours 15 minutes.
- 28,414 outputs passed automated checks; 10,343 retained their employer source.

These are local observations, not measured GitHub Actions capacity. Automated acceptance did not establish semantic correctness: manual review found section assignment errors in accepted drafts. The production validator continues to reject unsupported assignments and preserve required versus preferred scope; manual review of samples remains necessary.

The generic publishing path now excludes empty descriptions. Raw dry-run snapshots remain available as diagnostic evidence, including rejected entries.

## Production behavior and reproduction

The rewrite workflow is separate from scraping. It has a 350-minute job limit, a 315-minute generation step limit and a five-hour default total runtime budget. Pending source-hash work survives interruption and resumes on later runs. Validated prose is reused only when the model, prompt and complete source signature match. Individual generation rejections retain the source and do not fail the stage. A normal rewrite budget stop permits classification; cancellation and execution failures still stop handoff.

Run a database-free benchmark with 20 representative source descriptions:

```text
npm run descriptions:benchmark -- --input /path/to/20-source-jobs.json --output /path/to/report.json
```

Resume requires unchanged input, model, runtime, platform and policy. A model switch invalidates old cache signatures and benchmark checkpoints. The full dry-run benchmark defaults to the configured production checkpoint (legacy selector `--model 9000`); the 350M LFM variant remains an explicitly selected historical comparison option. Native inference was not completed for the LFM rollback.

See [runtime and publishing details](README.md) and [admin setup and pipeline checks](CONTROLS.md).
