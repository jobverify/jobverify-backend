# Scheduled recruitment-policy publishing

Status: implemented in the local workflow after the user's 2026-10-03 instruction to implement the plan without another approval request. The workflow now defaults to `policy`, and dependency installation and model startup failures are tolerated outside `enforce` mode. The request deadline remains 60 seconds and the shared inference budget remains 1200 seconds. Publishing this branch is required to activate the updated workflow on GitHub; this task has not pushed or deployed it.

## Implemented behavior

The local workflow enables `policy` for the shared scraper pipeline. Every provider already uses the shared classification stage before MongoDB upsert. This publishes the user-approved category defaults, with original employer requirements preserved separately. Uncalibrated Laya predictions remain diagnostic; model-only enforcement remains gated by a passed evaluation release. The backend API/schema changes must be deployed before the updated scheduled workflow is activated.

The applied workflow changes are:

```diff
--- .github/workflows/scraper.yml
+++ .github/workflows/scraper.yml
@@
-      JOB_CLASSIFICATION_MODE: ${{ vars.JOB_CLASSIFICATION_MODE || 'shadow' }}
+      JOB_CLASSIFICATION_MODE: ${{ vars.JOB_CLASSIFICATION_MODE || 'policy' }}
@@ Install CPU classification dependencies
-        continue-on-error: ${{ env.JOB_CLASSIFICATION_MODE == 'shadow' }}
+        continue-on-error: ${{ env.JOB_CLASSIFICATION_MODE != 'enforce' }}
@@ Start and warm Laya locally
-        continue-on-error: ${{ env.JOB_CLASSIFICATION_MODE == 'shadow' }}
+        continue-on-error: ${{ env.JOB_CLASSIFICATION_MODE != 'enforce' }}
```

The latter two changes let approved deterministic defaults continue publishing during a model setup failure. An explicitly configured repository `JOB_CLASSIFICATION_MODE` variable still overrides the default. No model files move onto Render, and no alerts are sent by the local first-source validation command. Scheduled scraper runs retain their existing alert behavior.

## Scope and compute limit

This activates policy writes for all scheduled scraper sources, beyond the first-source local validation. It does not promise full native model coverage within the existing 1200-second shared inference budget. Jobs after budget exhaustion still receive the reviewed defaults and a recorded model fallback. The local ABB run uses an explicit larger, temporary worker budget; the scheduled budget and 60-second request deadline are unchanged. Increasing scheduled compute budgets or sharding sources should be a separate measured change.

Historical records are not automatically backfilled. A separate reviewed backfill can use the existing resumable command with `--mode=policy`, or records can be refreshed by normal rescrapes. Neural enforcement remains disabled until held-out human-labelled evaluation passes.

## Authorization record

Automatic approval review previously rejected a production-wide workflow change combined with a longer request timeout because it exceeded the first-source validation scope. The user subsequently authorized implementation of this narrower rollout. The three workflow edits above are now applied; the timeout remains unchanged. No further approval request is pending for these edits.

## Verification

The workflow parses as valid YAML. All 60 selected existing workflow, classifier, and recruitment-policy tests passed. An unavailable-worker probe confirmed that Intern, previous-cohort, Manager, and Contract jobs still receive the approved authoritative defaults while native scans are recorded as incomplete. The final scoped review found no material issues; variable overrides, schedule, cleanup, and enforcement gates remain intact.
