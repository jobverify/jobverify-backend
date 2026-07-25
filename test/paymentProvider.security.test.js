import assert from "node:assert/strict";
import test from "node:test";

const modulePath = new URL("../src/services/paymentProvider.js", import.meta.url);

const importPaymentProviderModule = async (envOverrides = {}) => {
  const originalEnv = {
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    ALLOW_MOCK_PAYMENTS: process.env.ALLOW_MOCK_PAYMENTS,
    NODE_ENV: process.env.NODE_ENV,
  };

  Object.assign(process.env, envOverrides);

  try {
    return await import(`${modulePath.href}?t=${Date.now()}_${Math.random()}`);
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test("mock provider refuses to activate purchases without explicit opt-in", async () => {
  const { getPaymentProvider, isMockPaymentsAllowed } =
    await importPaymentProviderModule({
      PAYMENT_PROVIDER: "mock",
      ALLOW_MOCK_PAYMENTS: "",
      NODE_ENV: "development",
    });

  assert.equal(isMockPaymentsAllowed({
    PAYMENT_PROVIDER: "mock",
    ALLOW_MOCK_PAYMENTS: "",
    NODE_ENV: "development",
  }), false);

  const provider = getPaymentProvider("mock", {
    PAYMENT_PROVIDER: "mock",
    ALLOW_MOCK_PAYMENTS: "",
    NODE_ENV: "development",
  });

  await assert.rejects(
    provider.createCheckoutOrder({
      purchase: { _id: "purchase_1" },
      planConfig: { priceInr: 999 },
      user: { email: "dev@example.com" },
    }),
    /Mock payments are disabled/i,
  );

  assert.throws(
    () => provider.verifyPayment(),
    /Mock payments are disabled/i,
  );
  assert.equal(provider.verifyWebhook(), false);
});

test("mock provider can be enabled explicitly for local development", async () => {
  const { getPaymentProvider, isMockPaymentsAllowed } =
    await importPaymentProviderModule({
      PAYMENT_PROVIDER: "mock",
      ALLOW_MOCK_PAYMENTS: "true",
      NODE_ENV: "development",
    });

  assert.equal(isMockPaymentsAllowed({
    PAYMENT_PROVIDER: "mock",
    ALLOW_MOCK_PAYMENTS: "true",
    NODE_ENV: "development",
  }), true);

  const provider = getPaymentProvider("mock", {
    PAYMENT_PROVIDER: "mock",
    ALLOW_MOCK_PAYMENTS: "true",
    NODE_ENV: "development",
  });

  const checkout = await provider.createCheckoutOrder({
    purchase: { _id: "purchase_2" },
    planConfig: { priceInr: 1499 },
    user: { email: "dev@example.com" },
  });

  assert.equal(checkout.provider, "mock");
  assert.equal(checkout.providerOrderId, "mock_order_purchase_2");
  assert.deepEqual(provider.verifyPayment(), { verified: true });
  assert.equal(provider.verifyWebhook(), true);
});
