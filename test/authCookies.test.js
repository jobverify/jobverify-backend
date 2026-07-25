import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_COOKIE_NAME,
  getRequestAuthToken,
  getAuthCookieOptions,
} from "../src/utils/authCookies.js";

test("getRequestAuthToken prefers bearer authorization over cookies", () => {
  const req = {
    headers: {
      authorization: "Bearer bearer-token",
      cookie: `${AUTH_COOKIE_NAME}=cookie-token`,
    },
  };

  assert.equal(getRequestAuthToken(req), "bearer-token");
});

test("getRequestAuthToken reads encoded auth cookie when bearer token is absent", () => {
  const req = {
    headers: {
      cookie: `other=value; ${AUTH_COOKIE_NAME}=cookie%20token`,
    },
  };

  assert.equal(getRequestAuthToken(req), "cookie token");
});

test("auth cookie defaults are httpOnly and sameSite lax outside production", () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  const options = getAuthCookieOptions();

  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, false);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, 7 * 24 * 60 * 60 * 1000);

  process.env.NODE_ENV = originalEnv;
});
