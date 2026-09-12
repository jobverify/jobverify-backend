# Referral System Removal Design

**Date:** 2026-09-12

**Repositories:** `jobverify-backend`, `jobverify-frontend`

## Objective

Remove Jobverify's customer referral and referral-reward system from every runtime surface and provide a guarded deployment migration that revokes existing referral-derived access and removes its MongoDB data. Legitimate paid and administrator-managed access must remain intact.

## Scope

The removal includes:

- The checkout referral-code input and request field.
- The billing-page referral status, progress, code creation control, and related copy and styling.
- Referral frontend API functions, state, mocks, and automated test expectations.
- Referral billing routes and controller handlers.
- Referral validation, code generation, lookup, conversion counting, reward issuance, refund reconciliation, and billing-summary data.
- The `ReferralCode` and `ReferralRedemption` Mongoose models and their MongoDB collections.
- `PlanPurchase.referralCodeUsed`, `PlanPurchase.referredBy`, the `free_referral` status, and referral metadata used by reward purchases.
- Referral-specific account deletion work and referral-specific unit and integration tests.
- Existing referral reward purchases and referral-derived user access through a deployment migration.

The removal does not include:

- Career-page or job-description text mentioning employee referrals.
- Scraper logic that recognizes external employers' referral-only recruiting surfaces.
- HTTP `Referrer-Policy` security configuration or ordinary browser `referrer` semantics.

## Runtime Architecture

### Frontend

`PremiumPlansSection` sends checkout requests containing only `planId`. It no longer renders or stores a referral code. `BillingPage` presents access, purchase history, cancellation, and billing error states without referral progress or code creation. The billing API module no longer exports a referral creation request. Page metadata and tests contain no customer-referral claims.

The rest of the current uncommitted billing and session-isolation work remains unchanged. Edits must remove only referral responsibilities from already-modified files.

### Backend API

The billing router exposes no `/referrals/*` endpoints. The billing controller does not import referral models, forward a referral code to checkout, or return referral status. Checkout validation and `createCheckout` accept only a selected premium `planId`.

`buildBillingSummary` returns `access` and `purchases`. Public purchase summaries do not include `referralCodeUsed`. Existing payment verification, webhook, cancellation, refund, and paid entitlement behavior remains available.

### Backend Persistence and Services

The `ReferralCode` and `ReferralRedemption` model files are deleted. `PlanPurchase` no longer defines referral fields or permits `free_referral` as a status. Referral code generation, conversion recording, reward issuance, and refund-time referral redemption updates are removed from `planService`.

Refund reconciliation continues to restore or compact entitlement history for paid purchases. Any helper generalized for migration reuse must describe purchase entitlement removal without importing referral models or embedding referral policy in normal runtime paths.

User account deletion no longer imports or deletes referral documents because the collections are removed separately by the deployment migration.

## Data Migration

The backend includes a deployment-only migration command. Keeping this migration is the only intentional remaining repository reference to the retired data shape; runtime modules must not import it.

### Guards

- Dry-run is the default and performs no writes.
- Mutation requires the `--apply` argument.
- Mutation also requires `JOBVERIFY_ACKNOWLEDGE_REFERRAL_REMOVAL=true`.
- Mongoose automatic collection and index creation is disabled before connecting.
- The command reports the target database name and planned aggregate counts without logging email addresses, referral codes, payment credentials, or user tokens.
- Apply mode performs a complete preflight before its first write and aborts if an affected entitlement lineage cannot be interpreted safely.

### Dry-Run Output

The report includes:

- Referral reward purchase count.
- Count of affected users.
- Count of non-reward purchases containing legacy referral fields.
- Document counts for `referralcodes` and `referralredemptions` when those collections exist.
- Counts of users projected to become Free and users projected to retain paid or administrator-managed access.
- Validation issues that would block apply mode.

### Apply Algorithm

1. Identify legacy reward purchases by `status: "free_referral"` and validate every affected user's recorded entitlement lineage.
2. For each affected user, transactionally remove the remaining referral reward contribution from the entitlement timeline. Preserve valid paid-plan durations and independent administrator-managed entitlement boundaries. If no valid non-referral entitlement remains active, set the user to the Free role, clear premium dates and `lastPurchase`, disable premium alert flags, and deactivate the related subscription.
3. Delete the processed legacy reward purchase in the same user transaction.
4. Unset `referralCodeUsed` and `referredBy` from all surviving plan-purchase documents through the raw collection API.
5. Drop `referralredemptions` and `referralcodes` only after all affected users and purchases have been cleaned. A missing collection is treated as already complete.

The migration is idempotent. If execution stops between user transactions, rerunning it processes the remaining reward purchases. If cleanup completed previously, dry-run and apply report zero remaining referral records without recreating collections.

## Error Handling

- Invalid command acknowledgement fails before database configuration is loaded or any connection is attempted.
- Preflight ambiguity fails before mutation and reports non-sensitive identifiers needed for operator investigation.
- A failed per-user transaction rolls back that user's entitlement and reward-purchase deletion together.
- Collection drops occur last so a partially completed run retains the source records needed for recovery and retry.
- Runtime checkout and billing errors keep their existing public error envelopes; no referral-specific errors remain.

## Testing Strategy

### Frontend

- A source-surface regression test requires the plans component to omit referral labels, state, request fields, and referral endpoints.
- Billing E2E coverage removes referral fixtures and assertions while preserving plan loading, checkout, purchase history, cancellation, empty, retry, responsive, and admin billing scenarios.
- The production build and lint checks must pass.

### Backend

- Billing route tests require the retired referral endpoints to be absent.
- Controller and service tests require checkout to operate without referral input and billing summaries to contain only access and purchases.
- Schema tests require referral fields and `free_referral` to be absent from `PlanPurchase`.
- Account deletion tests no longer expect referral collection cleanup.
- Referral-only transaction suites are deleted; mixed payment lifecycle suites retain their non-referral coverage.
- Migration unit tests prove dry-run immutability, dual acknowledgement, preflight refusal, idempotence, and missing-collection handling.
- A disposable MongoDB replica-set integration test proves referral-only access is revoked, paid/admin access is preserved, legacy purchase data is cleaned, and both collections are dropped.

## Rollout

1. Deploy the frontend and backend runtime removal together so no new referral records can be created.
2. Run the migration without `--apply` against the intended deployment database.
3. Review the database name, counts, retained-access projection, and any blocking validation issues.
4. Set `JOBVERIFY_ACKNOWLEDGE_REFERRAL_REMOVAL=true` and rerun with `--apply`.
5. Run dry-run again and confirm zero reward purchases, zero legacy referral fields, and absent referral collections.
6. Run application smoke checks for login, billing summary, paid checkout, payment verification, cancellation, and access enforcement.

## Completion Criteria

- No Jobverify customer-referral UI, API, runtime service, model, or active schema remains.
- Existing referral-derived premium access is revoked by the guarded deployment migration.
- Legitimate paid and administrator-managed access remains valid.
- MongoDB referral collections are removed after a successful apply.
- Unrelated scraper referral wording and browser referrer security behavior are unchanged.
- Backend checks, migration tests, frontend tests, lint, and production build pass.
