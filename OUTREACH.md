# Hiring-manager outreach

Outreach extends the existing API and MongoDB deployment. It is available to authenticated accounts independently of paid-plan access. `Application.status` continues to mean an employer page was opened or the user manually confirmed an application. Contacting a person does not change that status.

## Entry points and requests

The job-detail page owns **Find hiring manager**, below Apply. A signed-in click starts a job-scoped discovery request. Viewing job pages, saved jobs, or application history never starts discovery, provider lookups, or model inference. Saved jobs use the same job-detail flow. Reopening an existing result is free of provider requests until the user explicitly requests refresh.

New route groups are `/api/user/outreach`, `/api/user/gmail`, and `/api/user/campaigns`. They use the existing authentication, JSON mutation, CSRF, and no-store behavior. Private task IDs and thread IDs are checked against the current account. Discovery may complete from a shared public-evidence cache; profiles, drafts, selected contacts, campaigns, and task inputs stay private.

## Configure discovery

Set `TAVILY_API_KEY` and `HUNTER_API_KEY` only in backend secrets. Use the providers' free plans, with paid credit purchases and automatic top-ups disabled in their dashboards. Monthly allowances are shared across users, not allocated afresh per account: 1,000 Tavily credits and 50 Hunter credits. The application records reservations before external requests and stops rather than enabling paid usage. There are five fresh discoveries per account per day; a shared cache hit does not consume a fresh discovery.

Discovery searches public indexed hiring evidence for an existing stored job. It ranks explicit hiring-post authors before relevant leaders and recruiting contacts, with at most three results. Results include the evidence URL and excerpt. Email lookup uses the employer domain, not the ATS hostname. Only a provider verification result produces the verified label. Missing enrichment leaves the contact available with its original source. Users can enter an address, then explicitly confirm it before sending.

Successful discovery caches live for seven days and are keyed by job context; email evidence is reusable for 30 days. Neither cache is proactively refreshed. Failed provider calls do not become evidence that a company has no hiring manager.

## GitHub Actions drafting

The existing `GITHUB_PAT`, `GITHUB_REPO`, and Actions `MONGO_URI` secret support an isolated outreach drafting workflow. It is separate from the scraper, description rewrite, and classification stages. Enable both `OUTREACH_ACTIONS_ENABLED` and `OUTREACH_ACTIONS_FREE_CONFIRMED` after deploying the workflow and setting repository/organization billing to block paid Actions usage. `OUTREACH_ACTIONS_MONTHLY_RUN_LIMIT` is an additional application dispatch cap; it is not proof of remaining account-level free minutes.

Set those same two enable/free-confirmation flags to `true` in the backend environment **and** in the backend GitHub repository's Actions variables. The workflow has its own guard; setting only backend flags leaves the Actions job disabled. Keep `MONGO_URI` in Actions secrets, not Actions variables.

Standard Ubuntu runners load the pinned LiquidAI LFM2.5-1.2B-Instruct Q4_K_M model with a pinned llama.cpp runtime. Only the immutable model file is cached; the runtime is downloaded separately and checked against its pinned checksum. Candidate biographies, prompts, and generated messages must not be logged, cached, uploaded as artifacts, or included in workflow input names. The workflow receives opaque work identifiers, reads requested tasks from MongoDB, and writes results back there.

Drafting is asynchronous and has a ten-request daily account limit. The UI shows queued/running/completed/failed states and supports leaving and returning. Batches are bounded, generation is serial, and workflows time out after ten minutes. Account existence and thread revision are rechecked before publishing a result so deletion or manual edits cannot be undone by a late model response. Drafts remain suggestions that the user reviews and edits.

## Gmail authorization and campaigns

Create a Google OAuth web client and enable the Gmail API. Set the exact callback URL in Google Cloud and `GMAIL_REDIRECT_URI`; provide `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`. Google login remains an identity-only flow. Connecting Gmail separately requests sending permission and sender identity, with state, session binding, and PKCE. Public distribution of the sensitive `gmail.send` scope needs Google's applicable OAuth verification.

Set `GMAIL_TOKEN_ENCRYPTION_KEY` to the base64 encoding of exactly 32 cryptographically random bytes. Refresh tokens are encrypted with AES-256-GCM before storage. Store this key outside the database, back it up securely, and keep it stable across restarts. A different key cannot decrypt existing connections; disconnect and reconnect affected accounts when rotating it.

Campaigns start as editable draft groups. Users choose recipients, review the sending account, edit text, remove items, and explicitly press Send. Approval freezes the item snapshots. The server sender processes only approved queued items, with atomic claims, a shared three-minute gap for each sender account, and 25 messages per rolling 24 hours per user. Cancel stops unsent items; it cannot recall an accepted or in-flight email. An ambiguous provider timeout is shown for manual review and is never automatically resent.

Campaign edits and approval require the `revision` of the campaign that was reviewed. A stale version is rejected rather than sending another tab's unreviewed changes. Draft campaigns are bound to the reviewed sender and connection version; reconnecting Gmail invalidates affected drafts and approvals. At most one Jobverify account may have an active connection to the same normalized Gmail address. Disconnect it from the original account before transferring it. Removing a tracked outreach contact cancels its pending campaign items; completed and in-flight send history is retained.

Disconnecting Gmail revokes authorization and stops unsent work. Account deletion removes its private outreach data and prevents background results from recreating it. Replies and interviews are manual tracker updates; send-only permission provides no inbox monitoring. Follow-up reminders default to four weekdays after sending. Follow-up sending still requires a new reviewed approval.

## Deployment and validation

1. Deploy backend models, routes, worker lifecycle, and the isolated drafting workflow with Actions dispatch disabled initially.
2. Register new indexes through the existing `db:indexes:plan` / `db:indexes:apply` process and its mutation safeguards. No rewrite of existing application records is required.
3. Configure free-tier provider accounts, Gmail OAuth secrets, and GitHub Actions free-usage controls. The frontend needs no new provider secrets.
4. Deploy the frontend and enable drafting only after the workflow and its model/runtime download have passed a controlled test.
5. Run the outreach API/provider/queue tests and desktop/mobile Playwright coverage using fixtures. Use a disposable local MongoDB for database integration tests. Automated tests must never send real outreach or invoke production workflows.

Operational records should retain task status, result counts, bounded error categories, provider-credit consumption, workflow identity, and send status/timing. Avoid logging message contents, candidate text, tokens, or complete provider responses.

Initial scope does not include CV uploads, standalone external-job searches, automated reply detection, open-tracking pixels, or automatic follow-up sequences.
