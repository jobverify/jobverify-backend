# Tailored resumes on GitHub Actions

Clicking **Generate tailored resume** saves an owner-scoped request in MongoDB
and dispatches `.github/workflows/tailored-resumes.yml`. The API does not run
inference or call a hosted inference API. The standard Ubuntu runner downloads
the checksum-verified model and llama.cpp runtime pinned in `outreach/model.json`,
loads the original resume and saved job from MongoDB, generates structured output
locally, and writes the result back to MongoDB. The existing dialog polls the
request and displays the preview and download when it completes.

## Deployment

1. Deploy `tailored-resumes.yml` and its worker code to the backend repository's
   default branch. GitHub must recognize the workflow before it can be dispatched.
2. Configure backend `GITHUB_REPO=owner/repository` and `GITHUB_PAT`. A fine-grained
   token needs access to that repository with **Actions: read and write**. Keep
   the token on the backend; it is not a frontend variable or worker input.
3. Set the repository Actions secret `MONGO_URI` to the database used by the API.
   The database must accept connections from the GitHub-hosted runner. The secret
   is supplied only to the generation step. Enable GitHub Actions for the repo.
4. Deploy the updated API. Dispatch is available when the GitHub credentials are
   configured. `TAILORED_RESUME_ACTIONS_ENABLED=false` disables API dispatch and
   recovery; no outreach flags or inference API keys are required.

`TAILORED_RESUME_ACTIONS_MONTHLY_RUN_LIMIT` defaults to **10** workflow dispatches
per UTC calendar month, shared across accounts. The configurable maximum is 100;
zero disables new dispatches. This application cap is separate from GitHub's
billing settings and does not guarantee that runner usage is free. Each user
also retains the existing limit of ten generation requests per UTC day.

GitHub's [workflow dispatch documentation](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
describes the repository permission and default-branch deployment requirements.

## Queue and failure behavior

- A waiting workflow is reused. A currently running workflow gets a follow-up
  dispatch so a request arriving as it finishes is not stranded. Concurrent
  clicks within one API process share the same in-flight dispatch.
- The workflow serializes runs without cancelling a running worker. Each run
  processes at most three resumes with a ten-minute job timeout. The API's
  recovery task redispatches remaining queued requests after five minutes.
- MongoDB leases and generation revisions prevent duplicate completion and late
  writes after a resume replacement, unbookmark, retry, or account deletion.
- Dispatch and model-startup failures produce a retryable failed state in the
  app. Interrupted leases are recoverable, with at most three worker attempts;
  requests expire after one day. A previous generated version is preserved.
- GitHub events contain only the branch ref. Candidate files, prompts, job IDs,
  account IDs and generated resumes are not workflow inputs, log messages,
  artifacts, or cache entries. Only the immutable model is cached.
- The outreach workflow now processes outreach drafts only. Tailoring uses the
  same model/runtime implementation with its own prompt and output schema.

For a worker failure, inspect the **Jobverify Tailored Resumes** Actions run and
its aggregate counts, correct deployment or database connectivity as needed,
and retry generation in the app. No database export or candidate data is needed
in logs to diagnose workflow startup.

Run focused validation from the backend:

```sh
node --test test/resumeTailoringWorkflow.test.js test/tailoredResumeActionsWorker.test.js test/resumeTailoringMongo.test.js test/resumeTailoringWorker.test.js test/resumeTailoringContent.test.js
npm run lint
```
