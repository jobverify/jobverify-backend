# Payment lifecycle integration checks

Run `node --test test/integration/paymentLifecycle.integration.js` from the backend root after provisioning the test MongoDB binary. Runtime downloads are disabled; the suite starts and removes a disposable MongoDB 8.2.6 replica set bound to `127.0.0.1`. It does not load `.env`, connect to an existing database, or initiate any payment/refund operation.

The suite signs synthetic Razorpay events with a test-only HMAC secret. It exercises checkout provider failures, recoverable failed attempts, signature rejection, amount/currency/payment/order validation, duplicate/out-of-order partial/full refund events, a processed snapshot in `refund.created`, capture/refund races, transaction rollback, access after earlier/latest/expired/refunded purchases, cancellation boundaries, and legacy entitlement windows.

Provider event contracts are taken from [Razorpay payment events](https://razorpay.com/docs/webhooks/payments/), [refund events](https://razorpay.com/docs/webhooks/refunds/), and [webhook delivery best practices](https://razorpay.com/docs/webhooks/best-practices/).

The stored refund ledger uses integer paise. Public billing responses use major currency units consistently with `PlanPurchase.amount`: both `refundedAmount` and `refunds[].amount` are rupee values for INR purchases. Partial refunds retain access; full refunds remove the refunded unconsumed entitlement while preserving other purchases/rewards.

Admin grants can retain an older `lastPurchase` reference. The regression suite verifies that a changed plan/start/expiry breaks the recorded purchase lineage, that refunding a newer extension restores the independent grant snapshot, and that refunding the older purchase cannot shorten access across that boundary. Both refund orders are covered.
