import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";

import User from "../src/models/User.js";
import PendingUser from "../src/models/PendingUser.js";
import { hashVerificationToken } from "../src/utils/authSecurity.js";
import { googleIdentity } from "../src/utils/googleAuth.js";
import {
  authenticateWithGoogle,
  login,
  register,
  resendVerification,
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

test("redirectVerifyEmail skips loopback frontend origins in production", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  const originalCorsOrigin = process.env.CORS_ORIGIN;
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173,https://jobverify.in";
  process.env.CORS_ORIGIN = "https://jobverify.in";
  process.env.NODE_ENV = "production";

  try {
    const res = createResponseDouble();

    await redirectVerifyEmail(
      {
        query: { token: "prod-verification-token" },
      },
      res,
    );

    assert.equal(
      res.redirectUrl,
      "https://jobverify.in/verify-email#token=prod-verification-token",
    );
  } finally {
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
    process.env.CORS_ORIGIN = originalCorsOrigin;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("register does not disclose that an account already exists", async () => {
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
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, {
      code: 201,
      success: true,
      pending: true,
      email: "student@example.com",
      message: "If this email can be registered, a verification email will be sent.",
    });
  } finally {
    User.findOne = originalUserFindOne;
    PendingUser.findOne = originalPendingFindOne;
  }
});

test("register stores a normalized pending phone number without changing the generic response", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  const originalUserFindOne = User.findOne;
  const originalPendingFindOne = PendingUser.findOne;
  const originalPendingSave = PendingUser.prototype.save;

  let savedPending = null;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";
  User.findOne = async () => null;
  PendingUser.findOne = async () => null;
  PendingUser.prototype.save = async function savePendingDouble() {
    savedPending = this;
    return this;
  };

  try {
    const res = createResponseDouble();
    await register(
      {
        body: {
          name: "Student",
          email: "student@example.com",
          password: "StrongerPass123",
          phoneE164: "9876543210",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.message, "If this email can be registered, a verification email will be sent.");
    assert.equal(savedPending.profile.phoneE164, "+919876543210");
  } finally {
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
    User.findOne = originalUserFindOne;
    PendingUser.findOne = originalPendingFindOne;
    PendingUser.prototype.save = originalPendingSave;
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
    assert.equal(user.passwordChangedAt instanceof Date, true);
    assert.equal(user.sessionVersion, 1);
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

test("verifyEmail creates the account with the password recorded at registration", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";

  const pendingUser = {
    email: "student@example.com",
    password: await bcrypt.hash("StrongerPass123", 10),
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
    assert.equal(savedUser.password, pendingUser.password);
  } finally {
    PendingUser.findOne = originalPendingFindOne;
    PendingUser.deleteOne = originalPendingDeleteOne;
    User.findOne = originalUserFindOne;
    User.prototype.save = originalUserSave;
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
  }
});

test("verifyEmail copies the pending phone number into the verified user contact", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  const originalPendingFindOne = PendingUser.findOne;
  const originalPendingDeleteOne = PendingUser.deleteOne;
  const originalUserFindOne = User.findOne;
  const originalUserSave = User.prototype.save;

  const pendingUser = {
    email: "student@example.com",
    password: await bcrypt.hash("StrongerPass123", 10),
    profile: { name: "Student", phoneE164: "+919876543210" },
  };
  let savedUser = null;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";
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
      { body: { token: "raw-verification-token" } },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(savedUser.contact.phoneE164, "+919876543210");
  } finally {
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
    PendingUser.findOne = originalPendingFindOne;
    PendingUser.deleteOne = originalPendingDeleteOne;
    User.findOne = originalUserFindOne;
    User.prototype.save = originalUserSave;
  }
});

test("verifyEmail promotes the pending password without requiring the registration browser", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";

  const hashedPassword = await bcrypt.hash("StrongerPass123", 10);
  const pendingUser = {
    email: "student@example.com",
    password: hashedPassword,
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

test("authenticateWithGoogle replaces an email placeholder with the Google account name", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalVerifyCredential = googleIdentity.verifyCredential;
  const originalUserFindOne = User.findOne;
  const originalPendingFindOne = PendingUser.findOne;

  process.env.JWT_SECRET = originalJwtSecret || "x".repeat(32);

  const existingUser = {
    _id: "user-1",
    email: "student@example.com",
    role: "user",
    accessRole: "free",
    google: { sub: null, picture: null, linkedAt: null },
    profile: { name: "student@example.com" },
    premium: { planId: "free", status: "inactive", expiresAt: null, whatsappAlertsEnabled: false },
    onboardingCompleted: false,
    deactivated: false,
    sessionVersion: 0,
    save: async function save() {
      return this;
    },
  };

  googleIdentity.verifyCredential = async () => ({
    email: " Student@Example.com ",
    emailVerified: true,
    name: "Student User",
    picture: "https://example.com/avatar.png",
    sub: "google-sub-123",
  });
  User.findOne = async () => existingUser;
  PendingUser.findOne = async () => {
    throw new Error("PendingUser lookup should not run when a user already exists");
  };

  try {
    const res = createResponseDouble();
    await authenticateWithGoogle(
      {
        body: {
          credential: "google-id-token",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, "student@example.com");
    assert.equal(existingUser.profile.name, "Student User");
    assert.equal(existingUser.google.sub, "google-sub-123");
    assert.equal(existingUser.google.picture, "https://example.com/avatar.png");
    assert.equal(existingUser.google.linkedAt instanceof Date, true);
    assert.equal(existingUser.lastLoginAt instanceof Date, true);
    assert.equal(res.cookies.length, 1);
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
    googleIdentity.verifyCredential = originalVerifyCredential;
    User.findOne = originalUserFindOne;
    PendingUser.findOne = originalPendingFindOne;
  }
});

test("authenticateWithGoogle promotes a matching pending registration into a verified user", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalVerifyCredential = googleIdentity.verifyCredential;
  const originalUserFindOne = User.findOne;
  const originalPendingFindOne = PendingUser.findOne;
  const originalPendingDeleteOne = PendingUser.deleteOne;
  const originalUserSave = User.prototype.save;

  process.env.JWT_SECRET = originalJwtSecret || "x".repeat(32);

  const pendingPassword = await bcrypt.hash("StrongerPass123", 10);
  const pendingUser = {
    email: "student@example.com",
    password: pendingPassword,
    profile: { name: "Student", phoneE164: "+919876543210" },
  };

  let deletedFilter = null;
  let savedUser = null;

  googleIdentity.verifyCredential = async () => ({
    email: "student@example.com",
    emailVerified: true,
    name: "Google Student",
    picture: "https://example.com/avatar.png",
    sub: "google-sub-456",
  });
  User.findOne = async () => null;
  PendingUser.findOne = async () => pendingUser;
  PendingUser.deleteOne = async (filter) => {
    deletedFilter = filter;
    return { deletedCount: 1 };
  };
  User.prototype.save = async function saveUserDouble() {
    savedUser = this;
    return this;
  };

  try {
    const res = createResponseDouble();
    await authenticateWithGoogle(
      {
        body: {
          credential: "google-id-token",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(savedUser.email, "student@example.com");
    assert.equal(savedUser.password, pendingPassword);
    assert.equal(savedUser.contact.phoneE164, "+919876543210");
    assert.equal(savedUser.google.sub, "google-sub-456");
    assert.equal(savedUser.isVerified, true);
    assert.deepEqual(deletedFilter, { email: "student@example.com" });
    assert.equal(res.clearedCookies.length, 1);
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
    googleIdentity.verifyCredential = originalVerifyCredential;
    User.findOne = originalUserFindOne;
    PendingUser.findOne = originalPendingFindOne;
    PendingUser.deleteOne = originalPendingDeleteOne;
    User.prototype.save = originalUserSave;
  }
});

test("authenticateWithGoogle creates a verified user when no account exists yet", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalVerifyCredential = googleIdentity.verifyCredential;
  const originalUserFindOne = User.findOne;
  const originalPendingFindOne = PendingUser.findOne;
  const originalUserSave = User.prototype.save;

  process.env.JWT_SECRET = originalJwtSecret || "x".repeat(32);

  let savedUser = null;

  googleIdentity.verifyCredential = async () => ({
    email: "student@example.com",
    emailVerified: true,
    name: "Google Student",
    picture: null,
    sub: "google-sub-789",
  });
  User.findOne = async () => null;
  PendingUser.findOne = async () => null;
  User.prototype.save = async function saveUserDouble() {
    savedUser = this;
    return this;
  };

  try {
    const res = createResponseDouble();
    await authenticateWithGoogle(
      {
        body: {
          credential: "google-id-token",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(savedUser.email, "student@example.com");
    assert.equal(savedUser.password, null);
    assert.equal(savedUser.profile.name, "Google Student");
    assert.equal(savedUser.google.sub, "google-sub-789");
    assert.equal(savedUser.isVerified, true);
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
    googleIdentity.verifyCredential = originalVerifyCredential;
    User.findOne = originalUserFindOne;
    PendingUser.findOne = originalPendingFindOne;
    User.prototype.save = originalUserSave;
  }
});

test("authenticateWithGoogle rejects deactivated users", async () => {
  const originalVerifyCredential = googleIdentity.verifyCredential;
  const originalUserFindOne = User.findOne;

  googleIdentity.verifyCredential = async () => ({
    email: "student@example.com",
    emailVerified: true,
    name: "Google Student",
    picture: null,
    sub: "google-sub-789",
  });
  User.findOne = async () => ({
    email: "student@example.com",
    deactivated: true,
    google: { sub: null, picture: null, linkedAt: null },
  });

  try {
    const res = createResponseDouble();
    await authenticateWithGoogle(
      {
        body: {
          credential: "google-id-token",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /deactivated/i);
    assert.equal(res.cookies.length, 0);
  } finally {
    googleIdentity.verifyCredential = originalVerifyCredential;
    User.findOne = originalUserFindOne;
  }
});

test("authenticateWithGoogle rejects unverified Google email addresses", async () => {
  const originalVerifyCredential = googleIdentity.verifyCredential;
  const originalUserFindOne = User.findOne;

  let userLookups = 0;

  googleIdentity.verifyCredential = async () => ({
    email: "student@example.com",
    emailVerified: false,
    name: "Google Student",
    picture: null,
    sub: "google-sub-789",
  });
  User.findOne = async () => {
    userLookups += 1;
    return null;
  };

  try {
    const res = createResponseDouble();
    await authenticateWithGoogle(
      {
        body: {
          credential: "google-id-token",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /verified/i);
    assert.equal(userLookups, 0);
  } finally {
    googleIdentity.verifyCredential = originalVerifyCredential;
    User.findOne = originalUserFindOne;
  }
});

test("resendVerification tells users to try tomorrow after two resends in 24 hours", async () => {
  const originalUserFindOne = User.findOne;
  const originalPendingFindOne = PendingUser.findOne;
  const pendingUser = {
    email: "student@gmail.com",
    resendCount: 2,
    resendWindowStartedAt: new Date(Date.now() - 60_000),
    lastResentAt: new Date(Date.now() - 61_000),
  };

  User.findOne = async () => null;
  PendingUser.findOne = async () => pendingUser;

  try {
    const res = createResponseDouble();
    await resendVerification({ body: { email: "student@gmail.com" } }, res);

    assert.equal(res.statusCode, 429);
    assert.equal(res.body.message, "You have used both verification resends. Please try again tomorrow.");
  } finally {
    User.findOne = originalUserFindOne;
    PendingUser.findOne = originalPendingFindOne;
  }
});

test("resendVerification starts a new allowance after the 24-hour window", async () => {
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  const originalUserFindOne = User.findOne;
  const originalPendingFindOne = PendingUser.findOne;
  const pendingUser = {
    email: "student@gmail.com",
    resendCount: 2,
    resendWindowStartedAt: new Date(Date.now() - 86_400_001),
    lastResentAt: new Date(Date.now() - 61_000),
    save: async function save() {
      return this;
    },
  };

  process.env.FRONTEND_ORIGIN = "http://localhost:5173";
  User.findOne = async () => null;
  PendingUser.findOne = async () => pendingUser;

  try {
    const res = createResponseDouble();
    await resendVerification({ body: { email: "student@gmail.com" } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(pendingUser.resendCount, 1);
    assert.ok(pendingUser.resendWindowStartedAt instanceof Date);
  } finally {
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
    User.findOne = originalUserFindOne;
    PendingUser.findOne = originalPendingFindOne;
  }
});

test("authenticateWithGoogle rejects verified accounts outside the allowed email domains", async () => {
  const originalVerifyCredential = googleIdentity.verifyCredential;
  const originalUserFindOne = User.findOne;
  let userLookups = 0;

  googleIdentity.verifyCredential = async () => ({
    email: "student@temporary-mail.example",
    emailVerified: true,
    name: "Student",
    picture: null,
    sub: "google-sub-temp-mail",
  });
  User.findOne = async () => {
    userLookups += 1;
    return null;
  };

  try {
    const res = createResponseDouble();
    await authenticateWithGoogle({ body: { credential: "google-id-token" } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Use a Gmail or educational email address.");
    assert.equal(userLookups, 0);
  } finally {
    googleIdentity.verifyCredential = originalVerifyCredential;
    User.findOne = originalUserFindOne;
  }
});

test("authenticateWithGoogle rejects accounts already linked to a different Google identity", async () => {
  const originalVerifyCredential = googleIdentity.verifyCredential;
  const originalUserFindOne = User.findOne;

  googleIdentity.verifyCredential = async () => ({
    email: "student@example.com",
    emailVerified: true,
    name: "Google Student",
    picture: null,
    sub: "new-google-sub",
  });
  User.findOne = async () => ({
    email: "student@example.com",
    deactivated: false,
    google: { sub: "old-google-sub", picture: null, linkedAt: new Date() },
  });

  try {
    const res = createResponseDouble();
    await authenticateWithGoogle(
      {
        body: {
          credential: "google-id-token",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /already linked/i);
  } finally {
    googleIdentity.verifyCredential = originalVerifyCredential;
    User.findOne = originalUserFindOne;
  }
});

test("authenticateWithGoogle returns unauthorized when Google credential verification fails", async () => {
  const originalVerifyCredential = googleIdentity.verifyCredential;

  googleIdentity.verifyCredential = async () => {
    throw new Error("invalid Google credential");
  };

  try {
    const res = createResponseDouble();
    await authenticateWithGoogle(
      {
        body: {
          credential: "bad-google-id-token",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /google/i);
  } finally {
    googleIdentity.verifyCredential = originalVerifyCredential;
  }
});

test("login tells passwordless Google users to continue with Google or reset their password", async () => {
  const originalUserFindOne = User.findOne;

  User.findOne = async () => ({
    email: "student@example.com",
    password: null,
    google: { sub: "google-sub-123", picture: null, linkedAt: new Date() },
  });

  try {
    const res = createResponseDouble();
    await login(
      {
        body: {
          email: "student@example.com",
          password: "ignored",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /Google sign-in/i);
    assert.match(res.body.message, /reset your password/i);
  } finally {
    User.findOne = originalUserFindOne;
  }
});
