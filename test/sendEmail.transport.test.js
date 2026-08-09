import assert from "node:assert/strict";
import test from "node:test";

import { sendVerificationEmail } from "../src/utils/sendEmail.js";

test("sendVerificationEmail posts a JSON payload to Brevo's transactional email API", async () => {
  const originalEnv = {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
  };
  const originalFetch = global.fetch;

  process.env.BREVO_API_KEY = "brevo_test_key";
  process.env.BREVO_SENDER_EMAIL = "no-reply@jobverify.test";
  process.env.BREVO_SENDER_NAME = "Jobverify";

  let request = null;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      async json() {
        return { messageId: "mail_123" };
      },
    };
  };

  try {
    const result = await sendVerificationEmail(
      "student@example.com",
      "https://jobverify.test/verify-email#token=abc123",
    );

    assert.deepEqual(result, { messageId: "mail_123" });
    assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.headers["api-key"], "brevo_test_key");

    const payload = JSON.parse(request.options.body);
    assert.equal(payload.subject, "Verify your Jobverify account");
    assert.deepEqual(payload.sender, {
      name: "Jobverify",
      email: "no-reply@jobverify.test",
    });
    assert.deepEqual(payload.to, [{ email: "student@example.com" }]);
    assert.match(payload.htmlContent, /Verify Email Address/);
    assert.match(payload.htmlContent, /abc123/);
  } finally {
    global.fetch = originalFetch;

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
