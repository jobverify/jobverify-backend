import assert from "node:assert/strict";
import test from "node:test";
import {
  createRateLimiter,
  isRateLimitingEnabled,
} from "../src/utils/rateLimit.js";

test("rate limiting is disabled by default outside production", () => {
  assert.equal(isRateLimitingEnabled({ NODE_ENV: "development" }), false);
  assert.equal(isRateLimitingEnabled({ NODE_ENV: "test" }), false);
});

test("rate limiting is enabled by default in production", () => {
  assert.equal(isRateLimitingEnabled({ NODE_ENV: "production" }), true);
});

test("ENABLE_RATE_LIMITING overrides the default environment behavior", () => {
  assert.equal(
    isRateLimitingEnabled({
      NODE_ENV: "development",
      ENABLE_RATE_LIMITING: "true",
    }),
    true,
  );
  assert.equal(
    isRateLimitingEnabled({
      NODE_ENV: "production",
      ENABLE_RATE_LIMITING: "false",
    }),
    false,
  );
});

test("createRateLimiter returns pass-through middleware when disabled", () => {
  const middleware = createRateLimiter(
    {
      windowMs: 60_000,
      limit: 1,
    },
    { NODE_ENV: "development" },
  );

  let nextCalled = false;
  middleware({}, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("admin routes initialize when rate limiting is enabled", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnableRateLimiting = process.env.ENABLE_RATE_LIMITING;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalConsoleError = console.error;
  const consoleErrors = [];

  process.env.NODE_ENV = "production";
  process.env.ENABLE_RATE_LIMITING = "true";
  process.env.JWT_SECRET = "12345678901234567890123456789012";
  console.error = (...args) => {
    consoleErrors.push(args.map((arg) => String(arg)).join(" "));
  };

  try {
    const moduleUrl = new URL(
      `../src/routes/adminRoutes.js?case=${Date.now()}`,
      import.meta.url,
    );
    const module = await import(moduleUrl.href);

    assert.equal(typeof module.default, "function");
    assert.equal(
      consoleErrors.some((message) => message.includes("ERR_ERL_KEY_GEN_IPV6")),
      false,
    );
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ENABLE_RATE_LIMITING = originalEnableRateLimiting;
    process.env.JWT_SECRET = originalJwtSecret;
    console.error = originalConsoleError;
  }
});
