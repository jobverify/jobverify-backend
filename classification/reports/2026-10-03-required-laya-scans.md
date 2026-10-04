# Required Laya scans before persistence

The worker-wide 20-minute cutoff is removed in runtime v4. Old `LAYA_TOTAL_BUDGET_SECONDS` values no longer affect classification. All publishable source jobs must complete native inspection (or have a matching previously completed scan) before policy/enforce MongoDB writes or dry-run snapshots. Three exhausted transient retries, incomplete input or incomplete predictions leave that source pending and unpublished. Publication still applies the user's category defaults; uncalibrated raw model predictions remain diagnostic.

Parallel lifecycle timeouts pause during queued classification, then resume for writes. CLI commands default to policy and install/warm Laya when needed. Shutdown now reaches active sequential and parallel scans. Complete decisions are checkpointed atomically after each job; incompatible, changed or incomplete decisions are not reused. Disk checkpoint failures do not invalidate complete scans held in memory.

The Actions workflow fails on model dependency/readiness failures, permits GitHub's six-hour job limit and stops its scraper step after 310 minutes to save progress. Model-decision caches are reusable across scheduled runs; source progress is restored only when rerunning the same workflow. A full catalog may require workflow reruns. This implementation does not claim a full 40,000-job catalog can finish within a single CPU runner job.

Actual CPU verification used saved American Chase source descriptions on isolated port 8766. The worker was deliberately launched with the obsolete `LAYA_TOTAL_BUDGET_SECONDS=0`: it warmed and completed all three scans, confirming that stale budget variables no longer disable inference. The existing v3 worker on port 8765 was left running. No application MongoDB writes or alerts were made.

| Saved job | Complete native scan | Final type | Filter years | CPU seconds |
| --- | --- | --- | --- | --- |
| Network Administrator | Yes, 1 window | Full-time Experienced | 3, 4, 5 | 19 |
| Corporate Trainer Intern | Yes, 1 window | Intern | 0 | 21 |
| Project Coordinator | Yes, 1 window | Full-time Fresher | 0 | 14 |

All three matching replays reused complete decisions. The intern's raw model experience label was `prior_required` with probability 0.6372; the final Intern category correctly forced zero years under the approved defaults. Results are tagged `complete: true`, `decisionSource: policy`, `reason: model_unvalidated`. This verifies execution, coverage and policy behavior, not improved learned-model accuracy. The owned verification worker was stopped afterward. Local evidence is `.cache/scraper-actions/required-laya-verification/{report.json,health-final.json,job-0.json,job-1.json,job-2.json}`.

Regression tests cover scans after twenty minutes, multi-window scans exceeding sixty seconds, calibrated health recovery, required-mode retries/rejection, blocked Mongo writes/expiry, dry snapshot ordering, disk cache identity/year invalidation and disk-full recovery, paused lifecycle clocks, shutdown during classification, pending source checkpoints and workflow configuration.

Final validation: **183/183 focused Node tests**, **27/27 Python tests**, parsed workflow YAML and syntax checks for 15,354 JavaScript files passed. Two additional description-rewriter CLI tests passed after the temporary MongoDB binary was cached. Their first cold run exceeded its 120-second test setup timeout during the 781 MB binary download; it was rerun successfully with the completed cache. These tests used temporary MongoDB only. The superseded timed-out test process was stopped; no verification model worker or temporary database was left running.
