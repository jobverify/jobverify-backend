/**
 * @file Payment provider abstraction for plan purchases.
 * @module services/paymentProvider
 */

import crypto from "node:crypto";

const PAYMENT_PROVIDER = String(process.env.PAYMENT_PROVIDER || "mock")
  .trim()
  .toLowerCase();
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const isMockPaymentsAllowed = (env = process.env) =>
  String(env.NODE_ENV || "").trim().toLowerCase() === "test"
  || TRUE_VALUES.has(String(env.ALLOW_MOCK_PAYMENTS || "").trim().toLowerCase());

const assertMockPaymentsAllowed = (env = process.env) => {
  if (!isMockPaymentsAllowed(env)) {
    throw new Error(
      "Mock payments are disabled. Configure a live payment provider or set ALLOW_MOCK_PAYMENTS=true for local development.",
    );
  }
};

const createMockProvider = (env = process.env) => ({
  name: "mock",
  async createCheckoutOrder({ purchase, planConfig, user }) {
    assertMockPaymentsAllowed(env);
    return {
      provider: "mock",
      providerOrderId: `mock_order_${purchase._id}`,
      checkout: {
        provider: "mock",
        providerOrderId: `mock_order_${purchase._id}`,
        amount: planConfig.priceInr,
        currency: "INR",
        note: `Mock checkout for ${user.email}`,
      },
    };
  },
  verifyPayment() {
    assertMockPaymentsAllowed(env);
    return { verified: true };
  },
  verifyWebhook() {
    return isMockPaymentsAllowed(env);
  },
});

const encodeBasicAuth = (keyId, keySecret) =>
  Buffer.from(`${keyId}:${keySecret}`).toString("base64");

const createRazorpayProvider = () => ({
  name: "razorpay",
  async createCheckoutOrder({ purchase, planConfig, user }) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials are not configured.");
    }

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodeBasicAuth(keyId, keySecret)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: planConfig.priceInr * 100,
        currency: "INR",
        receipt: String(purchase._id),
        notes: {
          email: user.email,
          planId: purchase.planId,
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) {
      throw new Error(data?.error?.description || "Failed to create Razorpay order.");
    }

    return {
      provider: "razorpay",
      providerOrderId: data.id,
      checkout: {
        provider: "razorpay",
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId,
        name: "Jobify",
        description: `${planConfig.name} access`,
      },
    };
  },
  verifyPayment({ providerOrderId, providerPaymentId, providerSignature }) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Razorpay secret is not configured.");
    }

    const digest = crypto
      .createHmac("sha256", keySecret)
      .update(`${providerOrderId}|${providerPaymentId}`)
      .digest("hex");

    return { verified: digest === providerSignature };
  },
  verifyWebhook({ rawBody, signature }) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || !rawBody || !signature) {
      return false;
    }

    const digest = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    return digest === signature;
  },
});

export const getPaymentProvider = (name = PAYMENT_PROVIDER, env = process.env) => {
  if (name === "razorpay") {
    return createRazorpayProvider();
  }

  return createMockProvider(env);
};

export const getPaymentProviderName = () => PAYMENT_PROVIDER;
export { isMockPaymentsAllowed };
