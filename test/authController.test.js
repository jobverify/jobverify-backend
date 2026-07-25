import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";

import User from "../src/models/User.js";
import PendingUser from "../src/models/PendingUser.js";
import { hashVerificationToken } from "../src/utils/authSecurity.js";
import {
  register,
  requestPasswordReset,
  redirectVerifyEmail,
  resetPassword,
  verifyEmail,
} from "../src/controllers/authController.js";

const createResponseDouble = () => {
  const result = {
    cookies: [],
    clearedCookies: [],
    redirectUrl: null,
    statusCode: 200,
    body: null,
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
    clearCookie(name, options) {
      this.clearedCookies.push({ name, options });
      return this;
    },
    redirect(url) {
      this.redirectUrl = url;
      return this;
    },
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

test("redirectVerifyEmail forwards legacy verification links into the frontend flow", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";

  try {
    const res = createResponseDouble();

    await redirectVerifyEmail(
      {
        query: { token: "raw-verification-token" },
      },
      res,
    );

    assert.equal(
      res.redirectUrl,
      "http://localhost:5173/verify-email#token=raw-verification-token",
    );
  } finally {
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
  }
});

test("register rejects duplicate accounts with a sign-in prompt", async () => {
  const originalUserFindOne = User.findOne;
  const originalPendingFindOne = PendingUser.findOne;

  let queriedFilter = null;

  User.findOne = async (filter) => {
    queriedFilter = filter;
    return {
      _id: "existing-user-id",
      email: "student@example.com",
    };
  };
  PendingUser.findOne = async () => {
    throw new Error("Pending registration lookup should not run for existing users");
  };

  try {
    const res = createResponseDouble();

    await register(
      {
        body: {
          name: "Student",
          email: " Student@Example.com ",
          password: "StrongerPass123",
        },
      },
      res,
    );

    assert.deepEqual(queriedFilter, { email: "student@example.com" });
    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, {
      code: 409,
      success: false,
      accountExists: true,
      message: "An account for this email already exists. Please sign in.",
    });
  } finally {
    User.findOne = originalUserFindOne;
    PendingUser.findOne = originalPendingFindOne;
  }
});

test("requestPasswordReset stores a reset token for matching accounts while keeping the response generic", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";

  const user = {
    email: "student@example.com",
    resetPasswordTokenHash: null,
    resetPasswordExpiresAt: null,
    async save() {
      return this;
    },
  };

  const originalUserFindOne = User.findOne;
  let queriedFilter = null;

  User.findOne = async (filter) => {
    queriedFilter = filter;
    return user;
  };

  try {
    const res = createResponseDouble();

    await requestPasswordReset(
      {
        body: {
          email: " Student@Example.com ",
        },
      },
      res,
    );

    assert.deepEqual(queriedFilter, { email: "student@example.com" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "If an account exists for this email, a password reset link will be sent.");
    assert.equal(typeof user.resetPasswordTokenHash, "string");
    assert.equal(user.resetPasswordTokenHash.length > 20, true);
    assert.equal(user.resetPasswordExpiresAt instanceof Date, true);
    assert.equal(user.resetPasswordExpiresAt.getTime() > Date.now(), true);
  } finally {
    User.findOne = originalUserFindOne;
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
  }
});

test("requestPasswordReset returns the same generic response when the account does not exist", async () => {
  const originalUserFindOne = User.findOne;
  User.findOne = async () => null;

  try {
    const res = createResponseDouble();

    await requestPasswordReset(
      {
        body: {
          email: "missing@example.com",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "If an account exists for this email, a password reset link will be sent.");
  } finally {
    User.findOne = originalUserFindOne;
  }
});

test("resetPassword updates the stored password and clears the reset token", async () => {
  const user = {
    password: "old-password-hash",
    resetPasswordTokenHash: "stored-token-hash",
    resetPasswordExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    async save() {
      return this;
    },
  };

  const originalUserFindOne = User.findOne;
  let queriedFilter = null;

  User.findOne = async (filter) => {
    queriedFilter = filter;
    return user;
  };

  try {
    const res = createResponseDouble();

    await resetPassword(
      {
        body: {
          token: "raw-reset-token",
          password: "ResetPass123",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Password reset successfully. You can now sign in.");
    assert.equal(queriedFilter.resetPasswordTokenHash, hashVerificationToken("raw-reset-token"));
    assert.equal(queriedFilter.resetPasswordExpiresAt.$gt instanceof Date, true);
    assert.equal(await bcrypt.compare("ResetPass123", user.password), true);
    assert.equal(user.resetPasswordTokenHash, null);
    assert.equal(user.resetPasswordExpiresAt, null);
  } finally {
    User.findOne = originalUserFindOne;
  }
});

test("resetPassword rejects expired or unknown reset tokens", async () => {
  const originalUserFindOne = User.findOne;
  User.findOne = async () => null;

  try {
    const res = createResponseDouble();

    await resetPassword(
      {
        body: {
          token: "expired-reset-token",
          password: "ResetPass123",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Password reset link is invalid or has expired.");
  } finally {
    User.findOne = originalUserFindOne;
  }
});

test("verifyEmail creates the account only after password submission", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";

  const pendingUser = {
    email: "student@example.com",
    profile: { name: "Student" },
  };

  const originalPendingFindOne = PendingUser.findOne;
  const originalPendingDeleteOne = PendingUser.deleteOne;
  const originalUserFindOne = User.findOne;
  const originalUserSave = User.prototype.save;

  let deletedFilter = null;
  let savedUser = null;

  PendingUser.findOne = async () => pendingUser;
  PendingUser.deleteOne = async (filter) => {
    deletedFilter = filter;
    return { deletedCount: 1 };
  };
  User.findOne = async () => null;
  User.prototype.save = async function saveUserDouble() {
    savedUser = this;
    return this;
  };

  try {
    const res = createResponseDouble();

    await verifyEmail(
      {
        body: {
          token: "raw-verification-token",
          password: "StrongerPass123",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Email verified successfully. You can now sign in.");
    assert.equal(res.body.redirectTo, "http://localhost:5173/verify-email?verified=1");
    assert.deepEqual(deletedFilter, { email: "student@example.com" });
    assert.equal(savedUser.email, "student@example.com");
    assert.equal(savedUser.profile.name, "Student");
    assert.notEqual(savedUser.password, "StrongerPass123");
    assert.equal(await bcrypt.compare("StrongerPass123", savedUser.password), true);
  } finally {
    PendingUser.findOne = originalPendingFindOne;
    PendingUser.deleteOne = originalPendingDeleteOne;
    User.findOne = originalUserFindOne;
    User.prototype.save = originalUserSave;
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
  }
});

test("verifyEmail reuses the pending password when the verification link opens in the original browser", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";

  const browserNonce = "browser-bound-registration-nonce";
  const hashedPassword = await bcrypt.hash("StrongerPass123", 10);
  const pendingUser = {
    email: "student@example.com",
    password: hashedPassword,
    pendingBrowserNonceHash: hashVerificationToken(browserNonce),
    profile: { name: "Student" },
  };

  const originalPendingFindOne = PendingUser.findOne;
  const originalPendingDeleteOne = PendingUser.deleteOne;
  const originalUserFindOne = User.findOne;
  const originalUserSave = User.prototype.save;

  let savedUser = null;

  PendingUser.findOne = async () => pendingUser;
  PendingUser.deleteOne = async () => ({ deletedCount: 1 });
  User.findOne = async () => null;
  User.prototype.save = async function saveUserDouble() {
    savedUser = this;
    return this;
  };

  try {
    const res = createResponseDouble();

    await verifyEmail(
      {
        body: {
          token: "raw-verification-token",
        },
        headers: {
          cookie: `jobify_pending_registration=${browserNonce}`,
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(savedUser.password, hashedPassword);
  } finally {
    PendingUser.findOne = originalPendingFindOne;
    PendingUser.deleteOne = originalPendingDeleteOne;
    User.findOne = originalUserFindOne;
    User.prototype.save = originalUserSave;
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
  }
});
