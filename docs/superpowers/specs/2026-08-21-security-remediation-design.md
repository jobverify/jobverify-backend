# Jobverify Security Remediation Design

Date: 2026-08-21
Scope: jobverify-backend and jobverify-frontend
Status: approved in chat with the compatibility constraint below; awaiting written-spec review before implementation planning

## Purpose

Remediate all 31 validated Codex Security findings without removing or degrading legitimate product functionality. Unsafe behavior is not considered product functionality: remote code execution, SSRF, TLS bypass, credential or account-state disclosure, unauthorized privilege acquisition, replayable security transitions, unbounded caller-controlled work, inconsistent financial state, and destructive publication are required to change.

This design is based on the sealed deep scan, current-code revalidation, and the current dirty release worktree. Existing user changes in scraper runner/persistence, payment configuration, frontend profile work, generated scraper outputs, and unrelated files must be preserved.

## Relationship to prior designs

This design supersedes prior specifications only where a validated security invariant makes an earlier clause unsafe:

- The Google Auth design remains authoritative for Google Identity Services, token verification, route shape, session shape, verified-email account matching, and later password setup. Its PendingUser promotion clause is replaced: the verified Google identity still resolves to one same-email account, but unverified pending password and phone data are not imported. The pending row is invalidated, and the authenticated user may establish a local password through the existing verified reset/setup flow.
- The Direct Live Scraper Jobs design remains authoritative for CLI modes, provider execution semantics, dry runs, source lifecycle reporting, and current Job-facing behavior. Its full-run pre-delete and incremental live-write clauses are replaced by candidate generations and an atomic active pointer because those clauses cause finding 5.
- The Razorpay Standard Checkout design remains authoritative for the existing checkout/verify routes, server-owned prices, order binding, HMAC verification, minimum value, frontend flow, and secret placement. Its no-new-tables non-goal is replaced only for the durable billing-event inbox required to make capture/refund/dispute processing idempotent.
- The Immediate Plan Cancellation design remains authoritative: a user cancellation immediately downgrades to Free and disables alerts without issuing a refund. Entitlement recomputation records and honors a cancellation cutoff/revocation marker so historical purchases do not silently reactivate access; a later new purchase can activate access normally.

When this document is silent, the earlier approved design remains in force. A task review must treat any broader behavioral change as a compatibility defect.

## Compatibility contract

Every implementation task must satisfy all of these rules:

1. Preserve legitimate user outcomes, paid-plan capabilities, administrator workflows, billing behavior, notification delivery, scraper coverage, public job visibility, response fields, and frontend flows wherever the security invariant permits.
2. Prefer compatibility adapters and additive fields over breaking replacements. If an unsafe legacy contract cannot remain, keep the same route and provide a bounded successor path, explicit error, migration window, and updated in-repository consumer.
3. Do not silently turn a valid operation into a failure. Security-policy rejections use stable codes and actionable operator/user guidance.
4. Characterize the existing valid path before changing it, add the malicious regression first, then retain a legitimate control test.
5. Preserve existing provider fixtures and catalog behavior. Remote page JavaScript may run only in the approved secret-free browser sandbox; remote text may never be evaluated as server code. A provider that requires invalid TLS, private-network access, unbrokered code execution, or an unreviewed Apply destination is quarantined with a visible reason rather than reported as an empty successful scrape.
6. Preserve the last validated job dataset through every partial, failed, timed-out, or rejected run.
7. Keep current paid-tier policy: Monthly retains its documented basic search filters and latest/oldest sorting; Semester and Yearly retain the full documented advanced filter and quick-sort set. Anonymous and Free callers retain normal latest browsing but cannot use paid control fields.
8. Preserve current registration password entry and browser-bound email verification. Google sign-in must not inherit an unverified pending password, phone, role, access tier, or consent.
9. Never inspect, print, hash, copy, or expose values from the local populated environment file while implementing release-secret controls.
10. Source and test edits must be limited to the affected task. Existing dirty hunks must not be reset, reformatted wholesale, or overwritten.
11. Stable job identity, saved references, click/analytics history, moderation state, public detail URLs, first-seen/newness, and alert deduplication survive dataset publication and rollback.
12. Existing paid, referral, administrator-granted, legacy, and cancellation-derived entitlements are inventoried and reconstructed with zero unexplained projection drift before ledger-derived reads become authoritative.
13. A server rejection that clears the auth cookie also clears frontend session state and provides a genuinely usable revocation-recovery path that does not require the removed cookie.
14. Every current reader accepts new role, token, trust, cursor, command, and status fields before any writer emits them. Mixed-version readers never see candidate datasets.
15. Complete discovery remains available through bounded client-side or build-time traversal. No compatibility route reassembles an unbounded result on the server.
16. A quarantined source cannot freeze healthy-source publication, but data that fails the current public-output policy is never carried forward as trusted.
17. Each route keeps its current safe response envelope and fields during the migration window; additive fields and adapters precede removals.
18. Backend and frontend are separate repositories and deployables. Every cross-repository change defines additive-backend-first rollout, overlap behavior, enforcement cutover, independent rollback, and both commit IDs.

## Validated finding inventory

| # | Severity | Finding | Design owner |
|---:|---|---|---|
| 1 | High | Google sign-in promotes an attacker-chosen pending password | Identity boundary |
| 2 | Critical | Scheduled scrapers execute remote JavaScript | Scraper worker/parser boundary |
| 3 | High | Scraper and enrichment destinations permit SSRF | Safe transport |
| 4 | Medium | Remote content and runtime work are unbounded | Safe transport and run budgets |
| 5 | Medium | Full runs delete the live dataset before replacement validation | Generation publication |
| 6 | Medium | Certificate failures retry with TLS verification disabled | Safe transport |
| 7 | Medium | Concurrent referral conversions can issue duplicate rewards | Billing/referral ledger |
| 8 | Medium | Password-reset tokens can be consumed concurrently | Security-state transitions |
| 9 | Medium | SEO feed loads and serializes the complete active collection | Public read budgets |
| 10 | Medium | Legacy pagination permits excessive database work | Public read budgets |
| 11 | Low | Saved jobs bypass public-job scope | Public job visibility |
| 12 | Medium | Search APIs incompletely enforce paid capabilities | Job capability policy |
| 13 | Low | Logout reports success when revocation fails | Session revocation |
| 14 | Low | WhatsApp opt-in accepts an unverified number | Number-bound consent |
| 15 | Low | Password login reveals Google-only accounts | Public auth response policy |
| 16 | High | Release directory may contain production-capable credentials | Release boundary plus external rotation |
| 17 | Low | Registration timing reveals known accounts | Public auth response policy |
| 18 | Low | Workbook manifest can traverse generator roots | Contained generation |
| 19 | Low | Workbook manifest can inject generated JavaScript | Data-only generation |
| 20 | Medium | Production can accept test or mock payment activation | Runtime configuration |
| 21 | Low | Production can trust credentialed loopback origins | Runtime configuration |
| 22 | Medium | Remote pagination can create unbounded scraper work | Run budgets |
| 23 | Low | Curl subprocesses can outlive scraper deadlines | Broker/process lifecycle |
| 24 | Medium | Arbitrary HTTPS Apply destinations are published as trusted | Publishable-link policy |
| 25 | Medium | Refunds and disputes do not revoke access or referral credit | Billing event ledger |
| 26 | Low | Concurrent clicks inflate popularity and analytics | Click idempotency |
| 27 | Low | Registration cookies reveal known addresses | Public auth response policy |
| 28 | Medium | Live-companies performs an uncached unbounded query | Materialized summaries |
| 29 | Medium | Promotion and reactivation preserve old sessions | Security-state transitions |
| 30 | Low | Workday probes lack a process-wide concurrency cap | Bounded refresh queue |
| 31 | Medium | Flat administrator authority bypasses peer protections | Administrative capabilities |

## Approaches considered

### Local point fixes

Patch each controller and provider independently. This is initially smaller, but leaves authorization, account-state privacy, URL trust, resource budgets, and transactional invariants duplicated. It cannot reliably close sibling scraper transport/evaluation sinks.

### Shared application boundaries plus brokered scraper workers

This is the selected approach. Keep the application as one Express/MongoDB deployment, add small policy/domain services with database-owned invariants, and run scraper providers in secret-free killable workers whose network access is brokered by the trusted parent. This closes shared paths without introducing new network services.

### New independently deployed services

Separate billing, authorization, feeds, and scraper ingestion into new services. This offers stronger operational isolation but adds deployments, queues, authentication, latency, and rollback complexity. The selected interfaces permit this later without requiring it for the present remediation.

## Application architecture

### Runtime trust configuration: findings 20 and 21

Create one pure runtime-security configuration builder and call it before Express listens or MongoDB/provider clients start. Production accepts only a named supported live payment provider and owned HTTPS browser origins. It rejects missing or unknown provider values, mock/test payment modes, loopback addresses in all textual forms, non-HTTPS origins, URL credentials, and unapproved IP literals.

Payment mode is explicit provider configuration, not inferred solely from a key prefix. Production uses separate live credential/webhook variable names and a production database namespace; test credentials, webhook secrets, events, and purchases cannot share the production inbox or entitlement ledger. The deployment preflight and process startup use the same pure builder.

CORS, CSRF, frontend-link generation, cookies, and payment-provider construction consume the same immutable validated object. Errors name a stable rule and field only, never the supplied value.

Compatibility:

- Development and tests retain explicit loopback/mock support outside production.
- Checkout and verification response shapes remain stable.
- Existing production deployments receive a pre-deploy validation command before startup enforcement is enabled.
- Current paymentProvider user edits are preserved and refactored through dependency injection rather than overwritten.

### Identity and account-state privacy: findings 1, 15, 17, and 27

Keep the current password-at-registration flow and browser-bound verification behavior. Pending passwords and phone data remain unverified and may be promoted only by the existing email-verification proof bound to the pending browser. Google sign-in creates or links a Google-only account and invalidates a conflicting pending row without importing password, phone, role, access, or consent.

The same release provides authenticated set-local-password and add/verify-phone successor flows. The authenticated user payload adds localPasswordConfigured and phoneVerificationStatus without exposing either publicly. The old pending password, cookie, verification link, and planted credentials fail after Google conversion; the new consume-once setup proof succeeds. Ordinary users who stay on email verification keep the existing browser-bound path.

Add a plan/apply/verify legacy-account migration. Existing Google-linked accounts are classified from durable creation/link history as pre-existing local accounts or Google-created accounts. A Google-created account whose password provenance cannot be independently bound is placed in password-setup-required state, its password is nulled, sessionVersion is incremented, pending/link artifacts are invalidated, and its verified email receives recovery guidance. Ambiguous provenance is manual-review plus forced reset, never continued use of a possibly planted password. Existing local accounts that later linked Google keep their proven local credentials.

Registration uses an indistinguishable response envelope for new, existing, and pending accounts. Every branch performs equivalent bounded password work and emits the same status, body, headers, cookie name, options, and size. Only the new-registration envelope contains a usable browser binding; other states receive cryptographically random decoys that authorize nothing.

Registration returns before branch-specific mail work. Every request durably creates the same fixed-shape registration-attempt/envelope command, performs equivalent password work, and returns the same real-or-decoy binding cookie. A worker performs new/pending/existing evaluation and real or no-op queued work; public latency never waits on email delivery or a branch-only database mutation. Cache-state variation, email-queue failure, and distributed abuse controls are part of the regression gate.

RegistrationAttemptOutbox has the explicit states pending, leased, retry_wait, delivered/noop, and dead_letter. Lease owner/expiry and compare-and-set completion make crashed workers reclaimable. Delivery uses a stable message/idempotency key through an idempotent mail relay, bounded exponential retry for at most 24 hours, a 15-minute overdue alert, and dead-letter operator recovery. The existing public resend route always returns its generic envelope; for a real pending registration it atomically advances an intent generation, coalesces any unleased command, and causes a leased stale generation to finish as noop. The worker mints or rotates the 30-minute verification proof only for the latest generation immediately before dispatch, so resend-before-processing, resend-after-processing, and delayed retries cannot deliver an authoritative stale proof. Existing-account and nonexistent-account commands traverse the same leases, retry bookkeeping, and bounded local noop adapter without sending mail.

The existing registration limits remain: one original delivery plus at most two resends, with the existing 120-second cooldown. Each successful real issuance retains today's 24-hour PendingUser lifetime reset and 24-hour jobverify_pending_registration HTTP-only browser cookie. A unique normalized-address digest plus intent-generation key permits at most one live command per address; terminal command metadata expires after eight days, and abuse counters cap retained work independently of attacker-selected address spelling. Dead-letter recovery reopens only the latest real intent while the PendingUser remains eligible; otherwise it is a bounded noop. Controls cover worker death before and after provider acceptance, provider timeout, duplicate delivery, resend before/after processing, stale-proof rejection, dead-letter recovery, bounded retention, and real/noop public-envelope parity.

Password login returns one external contract for unknown, pending, passwordless, wrong-password, and deactivated states, with a dummy bcrypt comparison when no usable hash exists. Provider/account guidance moves behind verified recovery or successful provider authentication.

The named login-failure envelope is HTTP 401 with one exact serialized JSON body, Cache-Control no-store, identical content type/security headers/cookie absence, and the same CAPTCHA and distributed rate-limit path. Every state performs one real-or-dummy bcrypt operation and observes a 250 ms minimum processing floor plus 0-25 ms cryptographic jitter. On the same controlled host, 30 warm and 30 cold samples per state must keep maximum median branch delta at or below 25 ms, maximum p95 branch delta at or below 50 ms, and a held-out account-state classifier at or below 60 percent accuracy.

Compatibility:

- Existing registration inputs, verification link, password selection, and successful local-login behavior remain.
- Existing Google sign-in remains; only unverified pending-data inheritance is removed.
- Public responses stay generic while authenticated/recovery UX provides guidance.
- Existing clients keep the same success route and response envelope.

### Atomic security transitions and logout: findings 8, 13, and 29

Password reset hashes first, then performs one conditional update filtered by reset-token digest and unexpired timestamp. The same update changes the password, clears reset fields, and increments sessionVersion. Exactly one concurrent request can succeed.

All one-time security artifacts use one conditional-consumption primitive keyed by digest, subject, purpose, issuance version, and expiry. Email verification, local-password setup, identity link, WhatsApp/OTP, password reset, and recovery flows each allow exactly one durable transition; replay/concurrent losers receive the same generic expired/used response. Credential or identity transitions revoke sibling artifacts and increment sessionVersion in the same transaction.

The cutover inventory is binding: pre-cutover PendingUser email proofs are either SHA-256 digests or the older stored raw-token field, expire after 30 minutes, and their container row expires 24 hours after its resend-mutable createdAt; the separate jobverify_pending_registration raw browser cookie and stored nonce digest live for 24 hours. User password-reset proofs are SHA-256 digests with a 30-minute expiry. Telegram account-link proofs are SHA-256 digests with a 10-minute expiry. Google linking uses the provider ID credential rather than an application link token. Distinct authenticated local-password-setup, generic recovery, and WhatsApp challenge artifacts do not have a pre-cutover format and therefore accept only vNext records.

Dual readers for the three existing consume-once families identify the subject from the matched stored record, never from caller input, and atomically consume that record under its legacy proof and expiry rule while all new writes use vNext. The storage location maps legacy User.resetPasswordTokenHash to purpose password_reset, preserving its current use by passwordless Google accounts to establish a first local password; it is never reclassified from caller input as setup or recovery. A legacy/vNext race shares the same subject-purpose transition lock, so at most one can win and sibling proofs are revoked in the same transaction. Pending-browser binding remains a separate proof: legacy verification preserves the existing cookie name, digest comparison, trusted-browser password reuse, email/reset URL-fragment bodies, and base64url Telegram deep-link syntax while the relevant drain is open.

Each legacy reader has its own removal clock after every legacy writer is fenced: Telegram remains for its 10-minute maximum plus the maximum 24-hour worker/retry delay; email verification and password reset remain for their 30-minute maximum plus that delay; the raw PendingUser fallback and pending-browser adapter additionally remain until 24 hours after the last pre-cutover issuance or resend plus that delay. Only unexpired, documented-lifetime raw email proofs may be hashed in memory during backfill, never logged; anomalous longer expiry is quarantined rather than extended. Cleanup verifies that no unexpired matching record exists before removing a reader, and the controlled index migration adds the currently absent PendingUser/Telegram cleanup indexes. If inventory finds another deployed legacy artifact, rollout stops until it receives an owner-bound reader and measured maximum lifetime or an owner-verified replacement delivery; missing subject or purpose is never synthesized. Controls cover pre-cutover issue/post-cutover use, browser-bound password reuse, legacy/vNext concurrency, replay, sibling revocation, expiry, replacement delivery, public token syntax, and every reader cleanup deadline.

JWTs gain a random jti. Blacklisting stores only a digest. Logout succeeds only after durable revocation; duplicate-key is idempotent success and other storage failures clear the browser cookie but return a retryable revocation-unconfirmed error. Both mandatory and optional authentication check the same digest and session version.

On revocation-unconfirmed failure, the backend also returns a short-lived signed revocation receipt bound to the token digest and expiry. The frontend always clears its user snapshot and cross-tab session state when the cookie is cleared, then may call public POST /api/auth/logout/retry with the receipt. That endpoint can only revoke the bound digest, is idempotent, never creates a session, and expires no later than the original JWT. This makes retry usable without retaining or exposing the bearer token.

Legacy JWTs without jti remain accepted only until the maximum seven-day pre-cutover expiry and are revoked by a digest of the whole token. New issuance always includes jti. After the drain deadline, legacy verification is removed.

All role, deactivation, reactivation, password, and identity-link transitions use one security-state service that increments sessionVersion exactly once in the durable mutation.

The transition matrix is binding:

| Transition | Version/audit | Artifacts revoked |
|---|---|---|
| Password reset or local-password setup | Increment once and audit | All active sessions, reset/setup/link/recovery tokens |
| Google or primary-identity link/change | Increment once and audit | All active sessions except the newly issued session, link/setup/recovery tokens |
| Promotion or demotion | Increment once and audit | All sessions, remember-device and pending-admin artifacts |
| Deactivate or reactivate | Increment once and audit | All sessions, reset/link/recovery/remember-device artifacts |
| Account recovery | Increment once and audit | All sessions and every older security artifact |

Compatibility:

- Successful logout keeps its current response.
- A storage outage is surfaced honestly and offers retry/logout-all recovery.
- Security-state changes intentionally require reauthentication; normal sessions remain unaffected.

### Administrative capabilities: findings 29 and 31

Extend roles to user, admin, and super_admin. Capabilities remain code-defined rather than editable database arrays. Standard admins retain dashboard/read access, ordinary-user moderation, job moderation, and plan-access management. Only super_admin can manage roles, mutate peer administrators, dispatch scraper workflows, or toggle scraper sources.

Before the first super_admin write, both repositories inventory and replace every exact user/admin comparison with a shared ordered-role or capability predicate. This includes routes, validators, serializers, navigation, access selectors, premium/ad/filter checks, notification eligibility, dashboard layout, queries, and audit display. Super-admin inherits every existing admin/product capability; promotion cannot lock the user out or downgrade product behavior.

Target hierarchy is enforced inside the service, not only middleware. Equal/higher target mutation and last-super-admin removal are rejected. Mutation, audit, and session-version increment commit together. External workflow dispatch uses a durable command record so the API returns accepted/pending rather than falsely claiming a remote side effect succeeded.

AdminCommand has a unique idempotency key, states queued, leased, dispatching, accepted, failed, unknown, and dead_letter, lease owner/expiry/heartbeat, attempt evidence, and a status endpoint. Pre-send failures retry at most five times with exponential backoff from 30 seconds capped at 15 minutes; exhausted work becomes dead_letter. A startup worker safely recovers expired leases. Because GitHub workflow dispatch has no repository-controlled exactly-once guarantee, a timeout after sending becomes unknown and requires reconciliation rather than blind retry. The existing 202 fields remain, with additive commandId and truthful state; the frontend shows queued/dispatching until accepted and polls status.

Bootstrap never happens at startup and never selects a first or configured account. A dry-run-by-default CLI requires an existing verified active admin, matching explicit target IDs, apply acknowledgement, reason, and a non-secret operator/ticket reference. Rollout bootstraps an approved operator before sensitive routes switch, preserving operational continuity.

### Number-bound WhatsApp consent: finding 14

Add a short-lived, rate-limited challenge bound to user ID and normalized phone. Store only a code digest. Confirmation atomically consumes the challenge and records verification/consent for that exact number. Changing the number immediately disables alerts and clears prior proof. Delivery calls the same eligibility predicate used by settings.

Production challenge delivery uses the existing WHATSAPP_PROVIDER=meta boundary plus WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID, with separately approved WHATSAPP_VERIFICATION_TEMPLATE_NAME and WHATSAPP_VERIFICATION_TEMPLATE_LANGUAGE configuration. Recipient-originated opt-out uses a signature-verified Meta webhook configured by WHATSAPP_APP_SECRET and WHATSAPP_WEBHOOK_VERIFY_TOKEN. Mock delivery is test/non-production only. Provider/template/webhook readiness is a rollout gate. The public request response is generic. Limits apply separately per account, normalized number, destination, and IP: one resend per 60 seconds, three issuances per 15 minutes, five per day, five confirmation attempts, and ten-minute expiry. Durable evidence records verifiedAt, consentedAt, revokedAt, verification method, and the exact normalized number.

Ship request, confirm, resend, cancel, and recipient-originated opt-out handling plus the visible Profile state machine before disabling legacy delivery. Store a proposed number separately, retain filters/preferences, expose masked destination, verification status, expiry, resend time, and reason, and never treat rollback as proof of the old number. Inventory Telegram and other recipient-binding flows for the same ownership invariant.

Compatibility:

- Existing filters, alert delivery, opt-out, and eligible-plan behavior remain.
- The only added step is ownership verification before first enablement or after number change.
- Existing unverified enabled records are disabled until reverification; they are not silently treated as verified.

### Billing, reversals, and referral rewards: findings 7, 20, and 25

Use a durable BillingWebhookEvent inbox uniquely keyed by provider, live merchant/account ID, and the Razorpay event ID header. Verify the signature over the unmodified raw body, persist the event and raw-body digest once, then acknowledge valid receipt with 2xx even when business processing is pending or unsupported. Invalid signatures receive non-2xx. Unknown signed financial events are retained as unsupported/pending, age into an operator alert, and are never treated as entitlement success.

Browser verification and webhook capture share one authoritative activation service. Before entitlement, the service fetches the payment and order server-to-server and atomically proves all of: live merchant/account and environment, payment ID, provider order ID, authenticated user, local purchase ID/receipt, exact server-owned amount, currency, captured/final status, and no conflicting payment binding. A mismatch has zero purchase, referral, or User side effects. Test and live credentials, webhook secrets, inboxes, and databases are separated.

Use the following monotonic provider state machine:

| Provider event/state | Durable result | Entitlement/referral result |
|---|---|---|
| payment.captured or order.paid | Fetch and bind captured payment/order; captured outranks authorized/failed | Activate exactly once after full binding |
| payment.failed | Record failure unless the same payment is already captured | Never activate or reverse a captured payment |
| refund.created | Record refund ID, payment ID, amount, currency, pending status | No reversal until provider reports processed |
| refund.processed | Add the unique processed refund and provider cumulative refunded amount | Full refund terminally reverses the purchase and linked counted referral conversion; partial refund proportionally removes only unused future duration and suspends, but does not duplicate or finally revoke, referral qualification until authoritative cumulative reconciliation |
| refund.failed | Mark that refund failed | No entitlement reduction from the failed refund |
| payment.dispute.created/action_required/under_review | Bind dispute/payment/order and mark contested | Suspend future purchase-derived access and referral effects pending resolution; preserve immutable history |
| payment.dispute.won | Mark won after provider fetch | Restore/recompute surviving entitlement and referral qualification |
| payment.dispute.lost | Mark the matched purchase terminally reversed | Revoke unused purchase entitlement and the linked counted referral conversion; revoke or suspend the associated unused-future reward and deactivate related access/subscription state |
| payment.dispute.closed | Fetch authoritative dispute/payment/refund state | Apply won/lost/final provider state; ambiguous closure remains pending |

Event precedence follows provider entity state, not delivery time. Refund and dispute IDs bind to one payment/order/purchase, and terminal reversal cannot be overwritten by a later stale capture snapshot. A scheduled idempotent reconciliation cursor fetches captured purchases and pending/aged inbox rows from Razorpay, detects missed webhooks, and updates the same state machine. Pending age, bounded retry/backoff, dead-letter, operator SLA, and reconciliation evidence are observable.

Processing a full refund or terminal lost dispute is one MongoDB transaction that sets the matched purchase's terminal reversal state, revokes its linked counted ReferralRedemption, revokes the unused future portion of its associated referral reward grant, deactivates any related Subscription/access projection, recomputes User from all surviving grants, and marks the inbox event processed. Already consumed reward time remains immutable accounting history and never becomes negative debt. A partial processed refund records the authoritative cumulative amount, proportionally removes only unused purchase duration, and sets its conversion/redemption and any derived reward to suspended-pending-reconciliation rather than finally revoked; no new referral threshold may rely on it while suspended. Reconciliation invokes this identical transaction and state transition, not a repair path. Transaction failure leaves purchase, subscription, referral, reward, User projection, and inbox marker wholly unchanged. Unknown or ambiguous provider state stays pending and grants no new access.

Introduce an EntitlementGrant ledger rather than treating PlanPurchase as the only source. Each immutable grant has a source kind and stable source ID for paid purchase, referral reward, administrator/manual grant, legacy backfill, cancellation, expiration, refund, or dispute; it records duration/effective interval, plan tier, activation time, capability-selection time, and revocation/suspension state. Keep User premium fields authoritative while dual-writing and comparing. A plan-only migration inventories every premium User and refuses apply on unexplained state, then backfills explicit legacy/admin grants and verifies zero projection drift before the ledger becomes authoritative.

The fold deliberately separates duration scheduling from effective capability selection to preserve current behavior. Paid purchases and referral rewards append their full duration after the current aggregate expiry using the existing JavaScript Date.setMonth calendar-month semantics: Monthly adds one month, Semester and its referral reward add four, and Yearly adds twelve. While surviving aggregate duration covers now, the most recently activated surviving grant selects planId, accessRole, filters/sorts, ads, stored/effective notification eligibility, and other tier capabilities immediately—even when its scheduled duration starts later. This preserves both legitimate upgrades (Monthly to Semester/Yearly becomes capable immediately) and the current converse behavior (Semester/Yearly to Monthly selects Monthly immediately), while same-tier purchases stack duration without changing capabilities. At aggregate expiry effective access becomes Free and the existing expiry worker retains its downgrade/subscription behavior.

Removing the newest grant restores the capability selector that would have been most recent among surviving grants when its recomputed coverage still includes now, otherwise Free, and removes only that grant's unused duration. Removing an earlier grant shifts later scheduled intervals earlier, never before their activation, while the newest surviving capability selector remains effective. Reversal never erases already consumed time or another grant's duration. A non-Free administrator/manual change remains an immediate tier selector; without an explicit expiry it appends that tier's duration as today, and with an explicit valid ISO expiry its audited override retains that exact endpoint, including an intentional shortening or already-expired effective-Free result. An administrator change to Free and user cancellation remain distinct immediate cutoff events and preserve their separately characterized legacy state effects; both make access/notification delivery ineligible immediately, while only user cancellation performs today's Subscription deactivation and field clearing. A later valid purchase starts again according to the resulting projected expiry/cutoff. Expired grants remain immutable history.

Before choosing the fold, a characterization fixture records the current cross-tier matrix and becomes the compatibility oracle. Table-driven controls cover Monthly to Semester/Yearly, Semester/Yearly to Monthly, same-tier stacking, paid and referral activation, explicit/default/admin-Free grants, reversal of newest and earlier grants, partial/full reversal, immediate user cancellation, repurchase after each cutoff, and expiry. Dual-write and migration zero-drift compare effective capabilities and stored projection at the same now—including accessRole, planId, filter/ad/sort behavior, effective WhatsApp/Telegram eligibility, stored notification toggles, job-alert Subscription activity, status, startedAt, expiresAt, and lastPurchase—not merely total duration or terminal expiry. New ledger provenance is checked against a characterized derivation; it is not falsely compared with the current non-persisted activationSource assignment.

User-requested cancellation is distinct from a provider refund. It records a durable cancellation cutoff or explicit access-revocation grant in the same transaction as the current immediate downgrade and alert disablement. Recomputation excludes grants revoked by that cancellation, while a purchase activated after the cutoff starts a new entitlement period. Existing cancellation route and response behavior remain unchanged.

Referral conversion, threshold claim, reward creation, entitlement recomputation, and referral pointer commit in one transaction. Reward identity is the immutable referral-code ID alone. The canonical EntitlementGrant stores rewardForReferralCodeId under a unique partial index; its transaction also creates exactly one legacy-compatible PlanPurchase projection whose metadata.rewardForReferralCodeId has its own unique partial index. The grant insert is the claim gate, and any duplicate key aborts the entire transaction, so separate collections are never mistaken for one cross-collection index. Campaign and rule version remain immutable audit metadata but never participate in uniqueness. A later campaign that may award again issues a new campaign-scoped referral-code identity through an explicit migration; changing a rule never requalifies an existing code. Only the transaction that wins the conditional claim may create or extend the reward. For one code, concurrent conversions, retries, rule changes, and manual duplicate attempts produce exactly one reward grant, one compatible purchase projection, and one entitlement extension; losing claims and duplicate-key paths have zero side effects. Before index creation, plan/apply/verify inventory and quarantine duplicate legacy rewards for reviewed reconciliation.

The compatibility-preserving reversal policy removes only unused future reward entitlement, never creates negative debt, and retains immutable history. Already consumed reward time is recorded for accounting and operator review but not charged back to the user. A reversed or suspended referral code never creates a second reward; restoration after an authoritative won dispute may reactivate only its original surviving reward grant.

### Job visibility and product policy: findings 11 and 12

Create one public-job read service and one job-capability policy. Detail, save, saved-list, saved-count, search, metadata, and autocomplete use the same public lifecycle/location predicate and shared allowlisted field vocabulary. Preserve route-specific safe projections: listCard and saved-list remain card-shaped, while detail retains its richer documented public fields. No route receives a broader internal Job document.

Authorize filters, sort, quick mode, page size, legacy page, and cursor policy before cursor decoding or query construction. Preserve current documented paid capabilities:

| Caller | Capabilities | Maximum page size |
|---|---|---:|
| Anonymous / Free | Default latest browsing | 12 |
| Monthly | Query, company, city/location; latest/oldest | 50 |
| Semester / Yearly | All documented advanced filters and sorts | 50 |
| Admin / Super-admin | All supported product controls | 50 |

Saved entries that are no longer public are omitted/pruned while the remaining order is preserved. No broader internal Job document is exposed.

The policy has one versioned canonical data fixture consumed by backend tests and generated into the frontend repository; it is not maintained as two handwritten tables. Cursor vNext binds policyVersion, capability class, normalized filters, and sort. GET, POST, legacy, cursor, metadata, and autocomplete map their differently named control fields into the same authorization input before database work. A stale policy cursor returns a recoverable conflict with replacement-start metadata and leaves valid filters intact.

### Public read budgets: findings 9, 10, and 28

All public job routes receive a cost profile, pre-query row/projection limit, maximum serialized bytes, maxTimeMS on every find/count/distinct/aggregate, and repeated-request accounting. Repeated identical expensive requests consume cost again. Production uses a shared atomic cost store or edge control across instances; if that dependency is unavailable, expensive/bulk routes fail closed while bounded detail/list reads retain a strictly lower local emergency budget. No route starts an unbounded query and truncates only after serialization.

The legacy list route retains the existing code/success/message/data/pagination envelope for accepted shallow pages, plus additive nextCursor and successor metadata. Existing shallow page URLs, totals, previous/next behavior, refresh, and browser history remain. Over-budget depth returns a stable bounded-pagination code and cursor starting point; the frontend replaces deep direct-jump controls with clear cursor navigation before enforcement and recovers from expired/policy-changed cursors without clearing filters.

SEO is delivered as a versioned bounded shard contract containing data, nextCursor, snapshot/generation token, stable ordering, and Link metadata. No server compatibility route traverses or reassembles shards. The preferred public artifact is a sitemap index plus bounded XML shards generated from one active snapshot; if the frontend build consumes the JSON feed, it must opt in with an explicit feed URL and bounded total item/byte/time, duplicate, retry, and incomplete-build policy. The current static-only sitemap behavior remains until that consumer is deliberately enabled. Default maximums are 500 records and 1 MiB per shard.

Live-companies keeps data.companies for the bounded first response, adds pagination and totalCompanies, and reads a materialized generation summary. Cache refresh is single-flight, deadline-bound, and out of the request path, with last-known-good data on refresh failure. The frontend deliberately uses either a documented bounded marquee sample or traverses additional pages within a client budget; it never silently mistakes the first page for the complete list.

### Click integrity: finding 26

Preserve the current authenticated per-user/job rolling 24-hour outcome with one atomically claimable record containing dedupeUntil, not a calendar bucket. In one transaction, compare-and-set an expired/missing claim, insert the Click event, and increment the stable active Job counter. Duplicate claims retain the current response fields with additive tracked false; other failures roll back all effects. A click strictly after 24 hours is countable.

## Scraper architecture

### Run context and provider policy: findings 3, 4, 22, 23, and 30

Every provider receives an immutable run context with deadline and counters for requests, redirects, bytes, pages, records, details, output jobs, parser structure, sockets, and subprocesses. Remote metadata may reduce work but never increase a limit. Provider overrides may preserve observed legitimate workloads but cannot exceed repository hard ceilings.

Provisional repository ceilings, validated and adjusted upward when measured healthy workloads require it before enforcement, are:

- five redirects per request;
- 16 MiB compressed and 64 MiB decompressed for HTML/JSON;
- 32 MiB and 250 pages for PDF, with 100 million aggregate pixels;
- 500 pages, 50,000 records, and 10,000 detail requests per provider;
- four sockets per provider and sixteen per runner;
- 512 MiB worker memory;
- eight concurrent Workday probes and 128 queued probes.

Captured healthy fixtures characterize providers before enforcement. Overrides require reviewed repository configuration and remain below hard ceilings.

Before enforcement, a no-publication telemetry/dry-run phase records per engine/provider p95 and maximum healthy compressed/decompressed bytes, redirects, pages, records, details, PDF complexity, runtime, and concurrency. Limits start above the measured maximum with headroom but below repository ceilings. Exact-at-limit and one-over-limit tests distinguish valid completion from a visible BUDGET_EXHAUSTED non-success; truncated output is never complete.

Provider policy separately declares request origins, redirect edges, and publish origins. Repository configuration may derive initial exact origins from controlled provider base URLs; remote responses can never extend policy.

The coordinator also owns a durable per-source run lease with owner, run ID, expiry, heartbeat, compare-and-set acquisition, safe expired-owner takeover, and idempotent release. Cancellation confirms socket, worker, document worker, and process-tree termination before releasing the lease. Parallel mode continues across different sources, while the same source cannot overlap across runners.

### Safe transport: findings 3, 4, and 6

All requests go through one parent-owned safe transport. It allows HTTP(S) only according to provider policy, rejects URL credentials and unexpected ports, resolves every A/AAAA address, rejects an answer set containing private, loopback, link-local, multicast, unspecified, metadata, special-use, or IPv4-mapped private addresses, and pins the validated address while retaining the original hostname for Host, SNI, and certificate validation.

The parent adds and pins a direct supported undici dependency and uses a reviewed custom connector/lookup to bind the validated address while preserving hostname, SNI, and certificate checks. It owns explicit decompression through zlib so wire and expanded byte counts are both enforceable; native fetch is not the enforcement primitive.

Automatic redirects are disabled. Every hop is separately authorized and sensitive headers are stripped across origins. Bodies are streamed through compressed/decompressed byte counters with connect, header, inter-chunk, and absolute deadlines. Abort destroys sockets and readers.

Worker protocol v1 reserves inherited file descriptor 3 for parent-to-worker frames and file descriptor 4 for worker-to-parent frames; stdin is closed and stdout/stderr are logs only. Length-prefixed binary frames carry request metadata, allowlisted headers, bounded request-body chunks, response metadata, bounded response chunks, cancellation, cancellation acknowledgement, and terminal error. The parent drains logs continuously under per-line, byte, and rate limits and truncates without blocking the protocol. Provider console.log, console.error, and direct stdout/stderr writes therefore cannot become protocol bytes. Malformed/oversized fd-4 frames terminate the worker; a regression with a malicious raw-stdout frame proves it cannot inject, acknowledge, or desynchronize protocol traffic. The protocol preserves method/body, repeated headers, status/statusText, final URL, redirect chain, text/json/arrayBuffer behavior, AbortSignal, and deterministic policy/size/deadline error codes. A worker cannot report completion until outstanding cancellations are acknowledged.

Certificate failures are terminal. No production rejectUnauthorized false, ignoreHTTPSErrors, or insecure retry remains. A legitimate private CA exception requires exact-host configuration, an external CA bundle, an expiry, and code-owner approval; it is never inherited by redirects.

### Secret-free provider workers and data-only parsing: findings 2, 4, and 23

Node 24 does not provide an enforceable network-denial permission, so production live providers execute from the first rollout inside a pinned Linux worker image started with no network namespace, read-only root filesystem, all capabilities dropped, no-new-privileges, PID/CPU/memory limits, and a small tmpfs. The worker image contains an allowlisted staged module/dependency bundle only; it excludes the repository root, environment files, job artifacts, logs, application source not required by providers, and every application credential. The parent broker remains outside the sandbox and communicates only over dedicated framed descriptors 3/4.

Production live startup fails closed unless a sandbox self-test proves direct DNS, TCP, fetch, node:http/node:https, child process, environment credential, database, and out-of-stage filesystem access fail while broker IPC succeeds. OS/runner egress rules independently deny worker traffic. Local unit tests and explicitly non-production dry runs may use an unsandboxed fixture adapter, but production and live persistence have no legacy/unconfined fallback.

The no-child provider worker receives a typed positive non-secret configuration message for source selection and reviewed timeouts/concurrency only; it never receives Chrome paths and never inherits the parent environment. A provider compatibility inventory covers global/injected fetch, shared helpers, native HTTP, axios, browser fallbacks, PDF/OCR, curl, request bodies, headers, final URL, arrayBuffer, and AbortSignal. Representative fixtures for every engine family and full catalog parity pass before the production legacy path is removed.

Browser-dependent sources retain functionality through a separate secret-free browser sandbox, not by launching Chrome from the provider worker. A trusted fixed container supervisor starts pinned Chromium. The untrusted Node automation/provider process runs under a separate UID and seccomp/process policy that denies child_process, fork, clone, and exec; it can only use the pre-opened CDP and broker descriptors. Chromium's own sandboxed zygote may create only its allowlisted renderer/GPU/utility descendants under the browser cgroup's independent PID/process budget, executable/filesystem allowlist, and Chromium sandbox; this renderer tree is not confused with provider-owned child execution. Self-tests prove provider spawn denial while repeated navigations can still create and reap bounded Chromium renderers. The container has no direct network namespace; every browser request, redirect, service-worker fetch, websocket attempt, download, and certificate decision is intercepted and either fulfilled through the parent safe-transport broker under the same exact source policy or denied. Its own framed descriptors, process/PID/memory/deadline limits, fresh ephemeral profile, download denial, popup policy, request/response byte budgets, and context teardown are independent of the data-worker pool. Chrome/system-CA controls are validated only for this broker. Remote page JavaScript may execute only inside that credential-free, network-denied disposable browser context; it cannot extend allowlists, access application secrets, launch processes, or persist state. Browser startup or interception self-test failure yields a visible non-success and blocks live publication; captured fixtures for every browser source prove parity before its legacy launcher is removed.

Remote text is never evaluated. Replace all network-to-vm, Function, and equivalent sinks with recursive-descent data parsers that accept only bounded primitives, arrays, and plain objects. DWR parsing accepts exactly the required callback shape and schema. Calls, members, computed expressions, functions, accessors, templates, spread, prototype keys, duplicates, and trailing statements are rejected.

After evaluator removal, the external-action ledger inventories credentials and test identities reachable by historical affected runs without reading values, rotates/revokes them, invalidates related sessions/tokens, and proves the old credentials fail. Repository closure alone cannot prove that historical runner compromise exposed nothing.

Curl fallbacks move behind the broker or become equivalent broker requests. Any temporary broker-owned child receives connect/total timeouts, output bounds, abort propagation, and process-tree termination. PDF/OCR work runs in a separately killable bounded document worker.

### Apply-link trust: finding 24

Fetch authorization and public-navigation authorization are separate. A mapped job is publishable only when sourceUrl and applyUrl match reviewed provider/company/ATS origins and tenant/path rules. Accepted jobs expose the normalized URL and backend-validated destination hostname. Rejected raw URLs live only in non-public generation audit data and quarantine the affected item/source.

Validation disables redirects and approves every hop, DNS result, tenant/path rule, and final destination through safe transport. Persist applicationTrustStatus, validated final URL/hostname, policy version, validation timestamp, and reason. Revalidate on policy/origin/tenant/redirect change and at least every 24 hours. Existing links receive plan/apply/verify origin inventory and backfill; unknown/untrusted rows never expose a public URL.

The frontend displays the backend-validated hostname and never infers trust from arbitrary URL syntax. The public Apply action uses a backend interstitial that revalidates every current redirect hop immediately before returning a redirect to the approved final destination and fails closed on DNS/redirect/policy change. Backend suppression is authoritative even during frontend rollout.

### Pagination and Workday work: findings 22 and 30

API Portal, SuccessFactors/DWR, Apollo, and provider-specific loops consume page, record, detail, request, and deadline budgets and reject repeated cursors/non-progress. Detail fan-out uses fixed pools rather than unbounded Promise.all.

Public job detail remains fast and returns stored state. Stale Workday refreshes enter a process-wide bounded queue with same-URL coalescing, global/per-origin concurrency, queue limit, timeout, and circuit breaker. Queue overflow drops best-effort refresh work without failing the public read.

Production may run multiple API instances, so queue ownership, coalescing, and the eight-probe limit use Mongo-backed leases/semaphore tokens or one dedicated refresh worker; the cap is fleet-wide, not per process. Deployment validation starts concurrent requests through multiple instances and proves aggregate active probes never exceed the limit.

### Atomic dataset publication: finding 5

Keep Job as the stable logical identity/state collection with its existing globally unique fingerprint and stable _id. Saved jobs, Click, alert delivery, manual moderation/hidden/suppression state, clickCount, public detail URL identity, first-seen/newness, and source identity continue to reference that stable Job. Scraper-derived active/expired state, missedScrapeCount, lastSeenAt, stale state, and source outcome belong to JobGenerationItem (or its candidate-owned source outcome), never stable Job. Add the separate JobGenerationItem collection uniquely keyed by generationId and jobId for those lifecycle values and versioned scraped/public fields; candidates never enter a collection visible to an unscoped legacy reader.

A full run resolves fingerprints to stable Job identities, writes candidate JobGenerationItems, records terminal source outcomes, validates the candidate, then switches the active-generation pointer with one compare-and-set operation. Candidate miss/expiry/last-seen transitions become authoritative only with that pointer. Generation-aware repositories join stable manual state with the pointed generation item and apply route-specific projections. New stable identities remain non-public until their first generation is active. Existing Job content/lifecycle fields remain as a legacy read projection during migration but are no longer the candidate store or generation-aware authority; a post-publication idempotent outbox may update that projection only after the pointer switch. Projection lag never affects generation-aware reads, and rejected/failed candidates leave every active lifecycle value unchanged.

Every non-full invocation—including SCRAPER_ONLY, start-at, start-after, and resume—uses copy-on-write publication. It binds an expected base generation and pointer revision, the ordered selected-source set, run mode, and catalog/policy version. SCRAPER_ONLY preserves its current input order, alias resolution, duplicate suppression, and invalid/ambiguous-name errors; start-at executes the inclusive catalog tail, and start-after executes the exclusive tail. The candidate inherits every unselected/deactivated source item and outcome from that exact snapshot, replaces only successfully selected sources, applies the same failure carry-forward, authoritative-empty, trust, lifecycle, and quality rules, then CAS-publishes from that base. A non-authoritative zero or failed selected source inherits its prior snapshot; an authoritative empty advances lifecycle only for that selected source. A resumed run retains its candidate results but revalidates them and the active base before publication; completed-source state cannot bypass current policy.

Selected-source results and terminal outcomes are durable as each source finishes, but they remain invisible until one publication CAS. When the existing normal failure threshold aborts the remaining work, the coordinator carries forward failed and unstarted sources, validates and publishes the successfully completed replacements, and preserves the current overall aborted/error reporting. A hard interruption leaves a leased candidate: startup recovery either resumes that exact candidate or, after lease expiry, converts in-flight sources to visible failure/carry-forward outcomes and publishes its already completed trustworthy sources before accepting an overlapping resume command. This retains today's partial-success outcome without incremental live writes.

On pointer conflict, the candidate compares the intervening generation's changed source set. A disjoint targeted candidate may rebase at most three times by inheriting the newer snapshot, overlaying only its selected results, rerunning all validation, and CAS-publishing from the new base. Overlapping targeted work, any full-run conflict, catalog/policy drift, or exhausted retries terminates with the stable visible DATASET_BASE_CONFLICT result and preserves the winner; it never overwrites newer source work. Parallel and sequential modes change execution order only: both assemble the same source-result map and perform one validated publication CAS while retaining their existing CLI summary fields, including the currently characterized deactivated-source envelopes. Dry runs keep their current selected-source JSON artifacts but create neither stable Job identities nor candidate/public generation records and never switch the pointer.

Before any candidate write, inventory every production direct Job read/write/aggregate/distinct/count path and move it behind the generation-aware repository or explicitly classify it as stable-identity-only. Deploy all readers first and fence mixed-version instances. Once candidate writes begin, rollback is only to a generation-aware build; an older binary may run only in read-only last-legacy-snapshot emergency mode with scraper writes disabled.

Dual-read migrations map existing Job _ids to stable identities without changing them, backfill one legacy generation, and verify saved-job ordering, Click/analytics counts, manual moderation/hidden state, generation-scoped expiry/last-seen/source misses, URLs, admin metrics, and alert dedupe. The current fingerprint index remains on Job; JobGenerationItem uses compound generation/job indexes. Publication never creates duplicate new-job alerts because alerts compare stable identity first-seen and the prior active version after the pointer switch.

Transient upstream failures carry forward that source's prior generation items only when they still pass the current public-output and trusted-link policy, marking them stale. Source/item policy rejection quarantines that source or item but does not freeze healthy sources. Global persistence, pointer, schema, or candidate-integrity failure blocks publication. A candidate cannot turn failure into zero jobs, and newly unsafe carried data is suppressed rather than trusted. No pre-run deleteMany remains.

Retain at least three prior generations and at least fourteen days of rollback history. A later bounded retention job deletes older inactive generation items, never stable Job identities that remain referenced. Alerts are emitted only after successful publication.

Current runner/saveToDB behavior for publishable-job analysis, invalid URL reporting, data-quality metrics, run timing, lifecycle reporting, resume, parallel/sequential modes, and dry-run artifacts is characterized and preserved before integration. Controls inject failure after candidate miss calculation and cover failed candidate immutability, authoritative empty, repeated misses across generations, hidden-job carry-forward, pointer conflict/rollback, legacy-projection lag, SCRAPER_ONLY, start-at/start-after, resume after failure, unselected-source preservation, concurrent disjoint targeted runs, targeted-versus-full conflict, and parallel/sequential parity.

### Workbook generation: findings 18 and 19

Validate the entire manifest before filesystem work. Identifiers use a narrow canonical rule. Resolve every target against an explicit approved root and reject empty, absolute, parent, drive-relative, UNC/device, separator, reserved-name, trailing-dot/space, and symlink/junction escape cases. Recursive deletion may target only a verified direct child of the dedicated generated root.

Remove manifest-selected JavaScript output and interpolation. One checked-in static test consumes data-only JSON from a fixed directory. Manifest data can neither select an import path nor become executable syntax.

Before cutover, a plan-only compatibility validator inventories every existing manifest, workday suffix, batch folder, and generated test. Land the static consumer first, prove identical valid case names/counts and package-test discovery, then remove old generated JavaScript only from verified contained roots. Reruns are deterministic and idempotent.

## Release-secret boundary: finding 16

Repository deliverables:

- build releases from an explicit clean staging allowlist rather than archiving the workspace;
- deny every populated environment file, including ignored files, logs, fixtures, archives, and image layers; allow only value-free examples;
- scan source and the final staged artifact while reporting rule/file only, never matched values;
- production entrypoints consume injected process environment and do not load a repository-local environment file;
- enforce the artifact check in CI.

The staging manifest is derived from required API and scraper entrypoints and includes the provider catalog, provider modules, approved runtime JSON/assets, workflow/runtime files, and frontend build artifacts while excluding environment files, local job outputs, logs, reports, and caches. Staged-artifact tests prove API startup and representative plus full catalog discovery, not merely that server.js imports.

Production and local environment loading use separate entrypoints. Production start, production scraper, migrations, and index commands consume injected process environment only. Development and explicitly named local commands may use a value-silent local env loader or Node env-file flag. Existing developer commands remain available through package-script aliases, and tests inject dummy maps only.

External closure is separate: determine whether the file or any artifact was distributed, rotate/revoke every possibly exposed credential and JWT signing key, invalidate existing JWTs, inspect provider/database/artifact access logs, purge shared copies after rotation, and prove old credentials fail. Repository work must not claim finding 16 fully closed without that evidence.

Unknown provenance requires rotation; absence of evidence is not proof of non-distribution. The external closure ledger records artifact/release/backups/images/support bundles/shared workspaces, distribution window, credential or test-identity class, custodian, rotation/revocation ticket, log-review interval, purge evidence, old-credential/JWT negative test, new-secret positive smoke test, and final approver.

## External-action ledger

Repository commits cannot by themselves prove these effects:

| Finding | External action/system of record | Required evidence and failure handling |
|---:|---|---|
| 2 | Credential owners for secrets historically reachable by scraper workers | Rotation/revocation ticket, old-secret rejection, session invalidation, log-review window; unknown scope means rotate |
| 16 | Release/deployment/provider custodians | Provenance inventory, purge evidence, every credential/test identity rotation, JWT invalidation, old/new negative/positive tests |
| 20 | Razorpay live account and deployment configuration | Live merchant/account/mode ownership check, test/live separation, provider fetch showing bound captured order/payment; mismatch blocks activation |
| 24 | Provider/ATS origin owners and Apply interstitial | Approved policy version, final-hop result, validation age, quarantine/review record; stale or ambiguous state fails closed |
| 25 | Razorpay events/reconciliation and support policy | Inbox/reconciliation state, refund/dispute IDs, derived entitlement/referral effects, aging SLA and dead-letter/operator resolution |
| 31 | GitHub workflow dispatch and administration | Command idempotency/lease record, remote acceptance or unknown reconciliation, audit record; no synchronous false-success claim |

Each ledger row names owner, deadline/SLA, retry/dead-letter behavior, compensating action, verification artifact, and closure approver. Queued or accepted locally is not proof of the external effect.

## Migration inventory

Every mutation has plan, apply, verify, and rollback/forward-recovery modes; is idempotent; refuses unexplained/duplicate state; prints identifiers/counts rather than secrets or PII; and runs first on a production-shaped disposable replica set.

| Area | Required schema/index/data work |
|---|---|
| Google/pending identity | Credential provenance/setup-required state; classify promoted accounts; revoke uncertain passwords/sessions/artifacts |
| Sessions/security artifacts | jti/token digests; one-time artifact purpose/subject indexes; format-specific 10-minute/30-minute/24-hour legacy drains plus maximum queue delay; raw-blacklist digest migration |
| WhatsApp | Challenge unique/TTL indexes; proposed/verified number and durable consent/revocation fields; preference-preserving disable plan |
| Admin | super_admin enum/readers; authority singleton; command lease/idempotency indexes; audit actor kinds; explicit bootstrap |
| Billing | Inbox provider/account/event unique index; provider object bindings; EntitlementGrant sources; refund/dispute state; reconciliation cursors |
| Referral | Unique rewardForReferralCodeId independent of campaign/rule version; duplicate inventory/quarantine before unique partial index |
| Clicks | Unique user/job rolling claim and dedupeUntil/expiry indexes |
| Jobs/generations | Stable Job identity retained; JobGenerationItem generation/job unique indexes; legacy generation; active pointer; all-read inventory |
| Apply trust | Origin/policy manifest; existing-link classification; trust status/final host/version/time backfill |
| Public summaries | Unique active summary/materialization keys and out-of-request refresh state |
| Workbook | Existing manifest validator, static-test parity, contained removal of verified generated files |

The index registry covers every affected model and verify fails on drift. Dedicated migrations replace or drop obsolete indexes only after preconditions pass. Approved production apply requires explicit target, change-ticket/acknowledgement, backup confirmation, and non-secret database fingerprint; NODE_ENV alone neither authorizes nor permanently prohibits a reviewed migration.

## Testing strategy

Every implementation task follows test-driven development:

1. Add a focused malicious regression and run it to observe the expected failure.
2. Add or retain a legitimate control proving intended functionality.
3. Implement the smallest shared-boundary fix.
4. Run the focused serial test slice.
5. Run the task review and resolve all critical/important findings.
6. Run the required MongoMemoryReplSet suite for transaction and unique-index claims.
7. Finish with syntax/lint, the curated security suite, affected catalog fixtures, frontend unit/build checks, repository static guards, and a bounded full-suite attempt.

Current baseline evidence:

- A curated security slice passes 124 of 124 tests in about 18 seconds.
- The package-wide command discovers 5,624 files and exceeded five minutes.
- scraperPersistenceFlow contains one pre-existing zero-eligible-result failure and one full-catalog path unsuitable for the fast loop.
- No cached MongoDB memory-server binary is currently present. CI must deliberately pre-cache and checksum an approved binary before transactional work can pass; inability to provision it blocks the release and never falls back to a production database.

Concurrency tests use explicit barriers. Network tests use injected fetches or loopback-only servers. Parser tests use malicious data fixtures without executing payloads. Path tests use temporary roots and outside sentinels. No test calls live providers or reads real credentials.

The authoritative gate manifest lives in-repository and records command, exact file list, expected count/range, serial/concurrency mode, timeout, teardown deadline, and artifact path. Defaults are 120 seconds per task slice, 180 seconds for the curated security gate, 600 seconds for the required replica-set gate, 900 seconds for full catalog parity, 300 seconds each for frontend unit/build, and 600 seconds for a non-authoritative package-wide attempt with process-tree cleanup. The known scraperPersistenceFlow failure is fixed before that file joins a clean gate, and runAll gains an injected tiny catalog before persistence tests invoke it. A timed-out broad suite cannot prove completion, but all authoritative scoped gates must pass.

The current 124/124 result remains baseline evidence only for the observed smaller slice; the gate manifest must not mislabel it as coverage of a longer command.

## Rollout and rollback

0. Record immutable pre-existing-work checkpoints independently in both repositories: branch/HEAD, git stash-created tracked-tree object or binary patch artifact, dirty-path hashes/statistics, and untracked manifest hashes. Assign serial ownership to collision paths such as runner/persistence/provider registry/payment/config. Every task compares its path diff with this checkpoint.
1. Land pure policies, test seams, additive fields, readers, and indexes without emitting new enums/contracts.
2. Deploy tactical fail-closed protections for production config, pending Google promotion, remote evaluation, TLS bypass, and destructive pre-delete.
3. Deploy additive backend response fields and dual readers; then deploy frontend readers that accept both legacy and successor envelopes. Record both repository commit IDs.
4. Run plan/apply/verify migrations with backups and explicit acknowledgement.
5. Enable backend writers for new roles/tokens/trust/commands only after every current reader accepts them.
6. Migrate shared scraper engines and provider families inside the enforced sandbox, then remove production legacy mode after full parity.
7. Enable trusted-link enforcement and generation publication only after legacy link backfill, all-reader inventory, mixed-version fence, and dry-run parity.
8. Enable fleet-wide Workday queue, materialized summaries, and public budgets after frontend/build consumers have migrated and telemetry confirms use.
9. Remove temporary dual reads and compatibility flags only after the maximum token/cursor/rollback drain window.

Cross-repository protocol:

| Phase | Backend | Frontend | Rollback |
|---|---|---|---|
| Additive | Emit old envelope plus optional new fields | Continue legacy | Either side independently |
| Reader | Accept legacy and vNext; no enforcement | Read both and prefer vNext | Frontend may roll back while backend stays additive |
| Migration | Dual-write and verify parity | Exercise successor UX | Roll back only to additive/reader builds |
| Enforcement | Require capability/trust/cursor/version after telemetry | vNext active | Never roll back to a build that rejects emitted fields or exposes staged data |
| Cleanup | Remove drained legacy paths | Remove legacy parser after backend drain | Forward fix only for unsafe controls |

Rollback never re-enables unsafe production payment/origin modes, pending credential promotion, remote code execution, TLS bypass, unverified notification delivery, or destructive pre-delete. Additive data remains readable by the prior application where safe; billing inbox/commands pause without data loss; last active generation remains available.

Production activation is blocked when live payment-object binding, worker sandbox/secret/egress self-test, origin validation, release artifact scan, all-reader generation fence, required migrations/index verification, or frontend compatibility reader is missing. No production feature flag bypasses these gates.

## Completion evidence

The objective is complete only when:

- every finding above has a regression test and a legitimate control;
- every affected source-to-sink path and sibling named by the scan uses the shared boundary;
- database indexes/migrations pass plan, apply in a disposable replica set, and verify;
- repository guards find no remote evaluation sinks on network data, TLS bypasses, unbrokered provider transport/process access, unscoped active-generation reads, or release-secret artifacts;
- focused backend and frontend suites, provider fixtures, lint/syntax, builds, and the bounded full-suite attempt are recorded;
- the original trigger for each finding no longer reproduces;
- intended valid flows remain proven;
- the fix report maps all 31 findings to files, tests, commands, and residual external actions;
- external rotation/provenance evidence is recorded before finding 16 is marked fully closed.

The fix report contains exactly 31 evidence rows. Each records finding number, entry point/source, closest control, protected sink/action, named siblings, malicious regression, legitimate control, database/deployment invariant, migration/external action, exact command/result, and produced artifact. Static searches supplement but never replace reachable-path, fixture, transaction, and deployment proof.

Required cross-repository controls include: local registration to Google to authenticated password/phone setup; logout-storage failure to cleared client state to usable retry; admin/super-admin routing/capabilities/demotion/session invalidation; existing WhatsApp subscriber re-verification with preferences preserved; legacy/new token drain; every entitlement source and reversal ordering with zero unexplained drift; shallow numbered-page/bookmark migration; SEO/live-company snapshot traversal; trusted legacy and quarantined Apply links; stable-ID generation publication with saves/clicks/moderation/no alert flood; mixed healthy/quarantined sources; provider-family broker parity and sandbox denial; and production-shaped staged API/catalog startup plus secret scan.
