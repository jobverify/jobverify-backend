import assert from "node:assert/strict";
import test from "node:test";
import { APIError, errorHandler } from "../src/middleware/errorHandler.js";

const createResponseDouble = () => {
  const result = {
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
  };

  return result;
};

test("errorHandler hides raw message details in production for unexpected errors", () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  const res = createResponseDouble();
  errorHandler(new Error("database exploded"), {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Internal Server Error");
  assert.equal("details" in res.body, false);

  process.env.NODE_ENV = originalEnv;
});

test("errorHandler preserves explicit APIError messages", () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  const res = createResponseDouble();
  errorHandler(new APIError(403, "Forbidden action"), {}, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Forbidden action");

  process.env.NODE_ENV = originalEnv;
});
