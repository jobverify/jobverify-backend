import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

const createResponseDouble = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("handleBillingWebhook rejects an invalid Razorpay webhook signature", async () => {
  const originalProvider = process.env.PAYMENT_PROVIDER;
  const originalWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.PAYMENT_PROVIDER = "razorpay";
  process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";

  try {
    const { handleBillingWebhook } = await import(`../src/controllers/billingController.js?case=invalid-${Date.now()}`);
    const rawBody = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test",
            order_id: "order_test",
          },
        },
      },
    });
    const res = createResponseDouble();

    await handleBillingWebhook(
      {
        body: JSON.parse(rawBody),
        rawBody,
        headers: {
          "x-razorpay-signature": "invalid_signature",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Webhook signature verification failed.");
  } finally {
    process.env.PAYMENT_PROVIDER = originalProvider;
    process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhookSecret;
  }
});

test("handleBillingWebhook rejects mock-provider events when mock payments are disabled", async () => {
  const originalProvider = process.env.PAYMENT_PROVIDER;
  const originalMockPayments = process.env.ALLOW_MOCK_PAYMENTS;
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.PAYMENT_PROVIDER = "mock";
  process.env.ALLOW_MOCK_PAYMENTS = "false";
  process.env.NODE_ENV = "production";

  try {
    const { handleBillingWebhook } = await import(`../src/controllers/billingController.js?case=mock-${Date.now()}`);
    const res = createResponseDouble();

    await handleBillingWebhook(
      {
        body: { event: "payment.captured", payload: { payment: { entity: {} } } },
        rawBody: "{}",
        headers: {},
      },
      res,
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Webhook signature verification failed.");
  } finally {
    process.env.PAYMENT_PROVIDER = originalProvider;
    process.env.ALLOW_MOCK_PAYMENTS = originalMockPayments;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("handleBillingWebhook accepts a valid Razorpay webhook signature for non-payment events", async () => {
  const originalProvider = process.env.PAYMENT_PROVIDER;
  const originalWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.PAYMENT_PROVIDER = "razorpay";
  process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";

  try {
    const { handleBillingWebhook } = await import(`../src/controllers/billingController.js?case=valid-${Date.now()}`);
    const rawBody = JSON.stringify({
      event: "payment.authorized",
      payload: {},
    });
    const signature = crypto
      .createHmac("sha256", "whsec_test")
      .update(rawBody)
      .digest("hex");
    const res = createResponseDouble();

    await handleBillingWebhook(
      {
        body: JSON.parse(rawBody),
        rawBody,
        headers: {
          "x-razorpay-signature": signature,
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  } finally {
    process.env.PAYMENT_PROVIDER = originalProvider;
    process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhookSecret;
  }
});
