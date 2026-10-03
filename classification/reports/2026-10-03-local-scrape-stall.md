# Local dry-run classification stall, 2026-10-03

The affected run is `artifacts/run-logs/local-scrape-20261003T195941-resilient/pipeline.log`.

## Cause

Laya was ready and the ten initial sources finished fetching 603 jobs by 20:01 IST. Every scraper slot then waited for its batch's shared serial CPU classification before writing a snapshot or finishing its source. The log had no dry-run classification stage/progress output, so it appeared frozen. The checkpoint heartbeat continued, but still showed zero completed sources more than twelve minutes after scraping started.

Long adverts exceeded the 60-second model request allowance. A client timeout did not interrupt the Python model forward. The old worker waited for its inference lock on subsequent requests, and the client retried busy responses. Repeated waits across queued jobs prevented even small sources from completing. The run started moving rapidly only when the worker's 20-minute inference budget expired and it returned fallback responses. The old worker ultimately reported 16 classified requests, 15 incomplete requests, 15 transport errors and three busy responses. Windows client disconnects were being counted as inference errors.

## Changes

- The worker returns busy immediately when another forward still holds its lock. Deadline overruns are explicitly reported as `request_deadline`.
- The client makes one busy attempt, then pauses new native requests for 30 seconds after timeout, busy or unavailable responses. Queued jobs proceed through the category policy with explicit fallback diagnostics. A later job retries native classification after the pause.
- Exhausted inference budget is terminal for queued uncached requests in that client run, preventing unnecessary per-job HTTP calls.
- Initial health failures are retried after cooldown; cancellation of one source does not permanently poison the shared handshake.
- Dry-run logging now exposes enrichment, classification and snapshot-write stages. Classification has a 15-second heartbeat and throttled processed/native-complete/fallback counts.
- Socket disconnects during either header or body writes no longer become model inference errors.
- Review caught a sequential-run logger scope error. It was reproduced by executing the actual sequential runner against an isolated fixture inventory and fixed before resuming the user run.

Complete native scans remain distinct from fallback, and category-default precedence remains unchanged. No trained weights or enforcement evaluation release were changed. The runtime-source change normally invalidates older inference-cache identities.

## Verification and recovery

129 targeted Node tests passed, including cache compatibility, classification cancellation, timeout recovery, busy recovery, terminal budget exhaustion, initial-health recovery, dry-run progress, sequential snapshot writing, parallel lifecycle, checkpoint resume and Laya bootstrap/ownership. All 25 Python classification tests passed. Scoped JavaScript syntax and diff whitespace checks passed.

The original run was gracefully stopped after its active sources drained. Its checkpoint retained **197 completed sources** and no active sources. The expired manually started worker was stopped using its recorded instance identity. The resilient launcher resumed the same dry-run directory with cleanup disabled, loaded the updated cached CPU worker, and continued only the **4473 remaining sources**. Initial live verification observed the checkpoint advance to **207/4670**, classification heartbeats in the same pipeline log, and two complete native requests on the new worker. At that initial verification the scrape was still running. No MongoDB writes were made.

The subsequent run completed **4670/4670 attempted sources** at **22:00:47 IST**, with exit code **0**, 40631 saved jobs and 63 source failures. The supervisor stopped its owned worker and both Node processes exited. The [full audit](2026-10-03-full-dry-run.md) records the timing comparison, complete-versus-fallback native coverage, additional source corrections, final local snapshot refresh and its verification.

Evidence: `.cache/laya-python/stall-fix-regression-tests.log`, `.cache/laya-python/stall-fix-python-tests.log`, the run's `run-state.json` and continuing `pipeline.log`.

The 20-minute shared native budget remains unchanged. Free CPU throughput does not guarantee a complete model pass for every scraped job; timeout/cooldown/budget rows are policy fallback and can be retried separately if complete neural coverage is required.
