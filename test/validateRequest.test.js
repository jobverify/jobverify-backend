import assert from "node:assert/strict";
import test from "node:test";

import { verifyEmail } from "../src/controllers/authController.js";
import {
  formatValidationErrors,
  requireJsonMutation,
  validateRequest,
} from "../src/middleware/validateRequest.js";
import {
  forgotPasswordValidation,
  billingVerifyValidation,
  jobQueryValidation,
  loginValidation,
  registerValidation,
  resetPasswordValidation,
  userProfileValidation,
  verifyEmailValidation,
  whatsappAlertsValidation,
} from "../src/validation/requestValidators.js";

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

const runValidationChain = async (validators, req) => {
  for (const validator of validators) {
    await validator.run(req);
  }
};

for (const missingField of [
  "providerOrderId",
  "providerPaymentId",
  "providerSignature",
]) {
  test(`billingVerifyValidation rejects requests missing ${missingField}`, async () => {
    const req = {
      body: {
        purchaseId: "507f1f77bcf86cd799439011",
        providerOrderId: "order_checkout_123",
        providerPaymentId: "pay_checkout_123",
        providerSignature: "a".repeat(64),
      },
    };
    delete req.body[missingField];
    const res = createResponseDouble();
    let nextCalled = false;

    await runValidationChain(billingVerifyValidation, req);
    validateRequest(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.errors.some((error) => error.path === missingField));
  });
}

test("formatValidationErrors omits values for sensitive fields only", () => {
  const errors = formatValidationErrors([
    { msg: "Password is required.", path: "password", value: "SuperSecret123!" },
    { msg: "Name must be between 1 and 80 characters.", path: "name", value: "x".repeat(81) },
    { msg: "Verification token is invalid.", path: "verificationToken", value: "raw-token" },
  ]);

  assert.deepEqual(errors[0], {
    msg: "Password is required.",
    path: "password",
  });
  assert.deepEqual(errors[1], {
    msg: "Name must be between 1 and 80 characters.",
    path: "name",
    value: "x".repeat(81),
  });
  assert.deepEqual(errors[2], {
    msg: "Verification token is invalid.",
    path: "verificationToken",
  });
});

test("validateRequest redacts password values while preserving non-sensitive ones", async () => {
  const req = {
    body: {
      name: "x".repeat(81),
      email: "student@example.com",
      token: "raw-verification-token",
      password: "weakpass",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(registerValidation, req);
  await runValidationChain(verifyEmailValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Validation failed");

  const nameError = res.body.errors.find((error) => error.path === "name");
  const passwordError = res.body.errors.find((error) => error.path === "password");

  assert.equal(nameError.value, "x".repeat(81));
  assert.equal("value" in passwordError, false);
});

test("verifyEmail fallback validation branch reuses the redacted validation response", async () => {
  const req = {
    body: {
      name: "x".repeat(81),
      email: "student@example.com",
      token: "raw-verification-token",
      password: "weakpass",
    },
  };
  const res = createResponseDouble();

  await runValidationChain(registerValidation, req);
  await runValidationChain(verifyEmailValidation, req);
  await verifyEmail(req, res);

  assert.equal(res.statusCode, 400);

  const passwordError = res.body.errors.find((error) => error.path === "password");
  assert.equal("value" in passwordError, false);
});

test("verifyEmailValidation allows token-only verification for trusted-browser flows", async () => {
  const req = {
    body: {
      token: "raw-verification-token",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(verifyEmailValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("forgotPasswordValidation accepts a normalized email address", async () => {
  const req = {
    body: {
      email: " Student@Example.com ",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(forgotPasswordValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.body.email, "student@example.com");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("resetPasswordValidation redacts token and password values", async () => {
  const req = {
    body: {
      token: "",
      password: "weakpass",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(resetPasswordValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);

  const tokenError = res.body.errors.find((error) => error.path === "token");
  const passwordError = res.body.errors.find((error) => error.path === "password");

  assert.equal("value" in tokenError, false);
  assert.equal("value" in passwordError, false);
});

test("jobQueryValidation accepts the oldest sort option", async () => {
  const req = {
    query: {
      sort: "oldest",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(jobQueryValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("jobQueryValidation accepts the 2000-card job page size", async () => {
  const req = {
    query: {
      limit: "2000",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(jobQueryValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("registerValidation accepts an optional normalized phone number", async () => {
  const req = {
    body: {
      name: "Student",
      email: "Student@example.com",
      password: "StrongerPass123",
      phoneE164: "+919876543210",
    },
  };
  await runValidationChain(registerValidation, req);
  validateRequest(req, createResponseDouble(), () => {});
  assert.equal(req.body.phoneE164, "+919876543210");
});

test("registration accepts Gmail and recognized educational email domains", async () => {
  for (const email of [
    "Student@Gmail.com ",
    "student@university.edu",
    "student@university.edu.in",
    "student@college.ac.in",
  ]) {
    const req = {
      body: {
        name: "Student",
        email,
        password: "StrongerPass123",
      },
    };
    const res = createResponseDouble();
    let nextCalled = false;

    await runValidationChain(registerValidation, req);
    validateRequest(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, `${email} should be accepted`);
    assert.equal(res.statusCode, 200);
  }
});

test("registration and login reject non-Gmail, non-educational email domains", async () => {
  for (const validators of [registerValidation, loginValidation]) {
    const req = {
      body: {
        name: "Student",
        email: "student@temporary-mail.example",
        password: "StrongerPass123",
      },
    };
    const res = createResponseDouble();
    let nextCalled = false;

    await runValidationChain(validators, req);
    validateRequest(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.errors.some((error) => error.msg === "Use a Gmail or educational email address."));
  }
});

test("registerValidation rejects a malformed optional phone number", async () => {
  const req = {
    body: {
      name: "Student",
      email: "Student@example.com",
      password: "StrongerPass123",
      phoneE164: "abcdefgh",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(registerValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
});

test("whatsappAlertsValidation allows enabling alerts with a persisted phone", async () => {
  const req = { body: { enabled: true } };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(whatsappAlertsValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("whatsappAlertsValidation normalizes accepted string booleans", async () => {
  const req = { body: { enabled: "1" } };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(whatsappAlertsValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.body.enabled, true);
  assert.equal(res.statusCode, 200);
});

test("whatsappAlertsValidation rejects non-normalized phone numbers", async () => {
  const req = { body: { enabled: true, phoneE164: "9876543210" } };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(whatsappAlertsValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
});

test("whatsappAlertsValidation rejects invalid phone numbers", async () => {
  const req = { body: { enabled: true, phoneE164: "abcdefgh" } };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(whatsappAlertsValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
});

test("jobQueryValidation accepts a reachable high-numbered job page", async () => {
  const req = {
    query: {
      page: "722",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(jobQueryValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("jobQueryValidation rejects job page limits above the 2000-card page size", async () => {
  const req = {
    query: {
      limit: "2001",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(jobQueryValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(
    res.body.errors.map((error) => error.msg),
    ["Limit must be between 1 and 2000."],
  );
});

test("userProfileValidation rejects unknown preferred job types", async () => {
  const req = {
    body: {
      preferredJobTypes: ["Intern", "Anything Else"],
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(userProfileValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(
    res.body.errors.map((error) => error.msg),
    ["Preferred job types must use the supported values."],
  );
});

test("requireJsonMutation allows bodyless DELETE requests", () => {
  const req = {
    method: "DELETE",
    headers: {},
    is: () => false,
  };
  const res = createResponseDouble();
  let nextCalled = false;

  requireJsonMutation(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("jobQueryValidation accepts experienceYear zero", async () => {
  const req = {
    query: {
      experienceYear: "0",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(jobQueryValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("jobQueryValidation accepts the no-experience-specified experience filter", async () => {
  const req = {
    query: {
      experienceYear: "unspecified",
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(jobQueryValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("jobQueryValidation accepts repeated multiselect job filter params", async () => {
  const req = {
    query: {
      company: ["Example Corp", "Example, Inc."],
      city: ["Bangalore", "Pune"],
      jobType: ["Intern", "Full-time Experienced"],
      experienceYear: ["0", "3", "unspecified"],
      experienceBucket: ["3-5", "5-8"],
      roleDomain: ["Data Science & AI", "Sales & Customer Success"],
      workArrangement: ["Remote", "Hybrid"],
      datePostedDays: ["7", "na"],
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(jobQueryValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("jobQueryValidation accepts zero as the Today date-posted filter", async () => {
  const req = { query: { datePostedDays: "0" } };
  const res = createResponseDouble();
  let nextCalled = false;

  await runValidationChain(jobQueryValidation, req);
  validateRequest(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("requireJsonMutation still rejects non-JSON DELETE requests with a body", () => {
  const req = {
    method: "DELETE",
    headers: {
      "content-length": "5",
      "content-type": "text/plain",
    },
    is: () => false,
  };
  const res = createResponseDouble();
  let nextCalled = false;

  requireJsonMutation(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 415);
  assert.equal(
    res.body.message,
    "This endpoint requires application/json requests.",
  );
});
