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
  jobQueryValidation,
  registerValidation,
  resetPasswordValidation,
  userProfileValidation,
  verifyEmailValidation,
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

test("jobQueryValidation accepts the 100-card job page size", async () => {
  const req = {
    query: {
      limit: "100",
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

test("jobQueryValidation rejects job page limits above the 100-card page size", async () => {
  const req = {
    query: {
      limit: "101",
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
    ["Limit must be between 1 and 100."],
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
      datePostedDays: ["7", "14"],
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
