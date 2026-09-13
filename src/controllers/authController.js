/**
 * @file Controllers for user registration, verification, login, and session logout.
 * @module controllers/authController
 */

import User from "./../models/User.js";
import PendingUser from "../models/PendingUser.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import BlacklistedToken from "../models/BlacklistedToken.js";
import Subscription from "../models/Subscription.js";
import { sendValidationError } from "../middleware/validateRequest.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../utils/sendEmail.js";
import { issueCsrfToken } from "../utils/csrf.js";
import {
  clearPendingRegistrationCookie,
  clearAuthCookie,
  getRequestCookie,
  getRequestAuthToken,
  PENDING_REGISTRATION_COOKIE_NAME,
  setPendingRegistrationCookie,
  setAuthCookie,
} from "../utils/authCookies.js";
import {
  createVerificationTokenPair,
  hashVerificationToken,
  isAllowedAccountEmail,
  normalizeEmailAddress,
} from "../utils/authSecurity.js";
import {
  applyExpiredAccessDowngrade,
  buildAccessSummary,
} from "../utils/accessControl.js";
import { googleIdentity } from "../utils/googleAuth.js";
import { resolveFrontendOrigin } from "../utils/runtimeConfig.js";

const GENERIC_REGISTRATION_MESSAGE = "If this email can be registered, a verification email will be sent.";
const GENERIC_RESEND_MESSAGE = "If a pending registration exists for this email, a verification email will be sent when eligible.";
const GENERIC_PASSWORD_RESET_MESSAGE = "If an account exists for this email, a password reset link will be sent.";
const PENDING_PASSWORD_MISSING_MESSAGE = "Your registration is missing a password. Please register again.";
const PASSWORD_RESET_SUCCESS_MESSAGE = "Password reset successfully. You can now sign in.";

const buildSessionUserPayload = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
  accessRole: user.accessRole,
  access: buildAccessSummary(user),
  profile: user.profile,
  onboardingCompleted: user.onboardingCompleted,
});

const GOOGLE_AUTH_FAILURE_MESSAGE = "Google sign-in failed. Please try again.";
const GOOGLE_EMAIL_VERIFICATION_MESSAGE = "Use a Google account with a verified email address to continue.";
const GOOGLE_ACCOUNT_LINK_CONFLICT_MESSAGE = "This account is already linked to a different Google sign-in.";
const RESEND_COOLDOWN_MS = 60 * 1000;
const RESEND_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RESEND_LIMIT_REACHED_MESSAGE = "You have used both verification resends. Please try again tomorrow.";

// Generates a JWT token valid for 7 days.
const generateToken = (id, role, sessionVersion = 0) => {
  return jwt.sign({ id, role, sessionVersion }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const getTokenExpiresAt = (token) => {
  const decoded = jwt.decode(token);
  if (decoded?.exp) {
    return new Date(decoded.exp * 1000);
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

const getFrontendOrigin = () => resolveFrontendOrigin(process.env);

const buildFrontendVerifySuccessUrl = () => {
  const url = new URL("/verify-email", getFrontendOrigin());
  url.searchParams.set("verified", "1");
  return url.toString();
};

const buildVerificationLink = (verificationToken) => {
  const url = new URL("/verify-email", getFrontendOrigin());
  url.hash = new URLSearchParams({ token: verificationToken }).toString();
  return url.toString();
};

const buildPasswordResetLink = (resetToken) => {
  const url = new URL("/reset-password", getFrontendOrigin());
  url.hash = new URLSearchParams({ token: resetToken }).toString();
  return url.toString();
};

const buildGoogleMetadata = (identity, currentGoogle = {}) => ({
  sub: identity.sub,
  picture: identity.picture ?? currentGoogle.picture ?? null,
  linkedAt: currentGoogle.linkedAt ?? new Date(),
});

const issueAuthenticatedSession = async (user, res, successMessage = "Logged in successfully") => {
  const accessChanged = applyExpiredAccessDowngrade(user);
  if (accessChanged) {
    await Subscription.updateOne(
      { user: user._id },
      { $set: { isActive: false } },
    ).catch(() => null);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id, user.role, user.sessionVersion ?? 0);
  setAuthCookie(res, token);

  return res.status(200).json({
    code: 200,
    success: true,
    message: successMessage,
    user: buildSessionUserPayload(user),
    accessChanged,
  });
};

export const getCsrfToken = (req, res) => {
  const token = issueCsrfToken(req, res);

  res.status(200).json({
    code: 200,
    success: true,
    token,
  });
};

// Registers a new user, stores a pending record, and sends a verification link.
export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors);
  }

  const { name, email, password } = req.body;
  const normalizedEmail = normalizeEmailAddress(email);

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      return res.status(201).json({
        code: 201,
        success: true,
        pending: true,
        email: normalizedEmail,
        message: GENERIC_REGISTRATION_MESSAGE,
      });
    }

    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
    if (pendingUser) {
      return res.status(201).json({
        code: 201,
        success: true,
        pending: true,
        email: normalizedEmail,
        message: GENERIC_REGISTRATION_MESSAGE,
      });
    }

    const verificationToken = createVerificationTokenPair();
    const hashedPassword = await bcrypt.hash(password, 10);

    const pending = new PendingUser({
      email: normalizedEmail,
      password: hashedPassword,
      profile: { name },
      verificationTokenHash: verificationToken.tokenHash,
      verificationTokenExpiresAt: verificationToken.expiresAt,
      lastResentAt: new Date(), // initialized to register time
    });

    await pending.save();

    const magicLink = buildVerificationLink(verificationToken.token);
    sendVerificationEmail(normalizedEmail, magicLink).catch((err) => {
      console.error(`[Email Delivery Error] Failed to send email to ${normalizedEmail}:`, err.message);
    });
    res.status(201).json({
      code: 201,
      success: true,
      pending: true,
      email: normalizedEmail,
      message: GENERIC_REGISTRATION_MESSAGE,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      code: 500,
      success: false,
      message: "Server Error",
    });
  }
};

// Redirects verification links into the frontend flow so account creation happens over POST.
export const redirectVerifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "Verification token is required",
    });
  }

  return res.redirect(buildVerificationLink(token));
};

// Completes email verification with the password captured during registration.
export const verifyEmail = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors);
  }

  const { token } = req.body;

  try {
    const tokenHash = hashVerificationToken(token);
    const pendingUser = await PendingUser.findOne({
      $or: [
        {
          verificationTokenHash: tokenHash,
          verificationTokenExpiresAt: { $gt: new Date() },
        },
        {
          verificationToken: token,
          verificationTokenExpiresAt: { $gt: new Date() },
        },
      ],
    });

    if (!pendingUser) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Verification token expired or invalid user.",
      });
    }

    const existingUser = await User.findOne({ email: pendingUser.email });
    if (existingUser) {
      await PendingUser.deleteOne({ email: pendingUser.email });
      clearPendingRegistrationCookie(res);
      return res.status(409).json({
        code: 409,
        success: false,
        message: "An account for this email already exists. Please sign in.",
      });
    }

    if (!pendingUser.password) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: PENDING_PASSWORD_MISSING_MESSAGE,
      });
    }

    const user = new User({
      email: pendingUser.email,
      password: pendingUser.password,
      profile: pendingUser.profile ? { name: pendingUser.profile.name } : {},
      isVerified: true,
      lastLoginAt: new Date(),
    });

    await user.save();

    await PendingUser.deleteOne({ email: pendingUser.email });
    clearPendingRegistrationCookie(res);

    return res.status(200).json({
      code: 200,
      success: true,
      message: "Email verified successfully. You can now sign in.",
      redirectTo: buildFrontendVerifySuccessUrl(),
    });
  } catch (err) {
    console.error("Verification failed:", err.message);
    if (err?.code === 11000) {
      return res.status(409).json({
        code: 409,
        success: false,
        message: "An account for this email already exists. Please sign in.",
      });
    }
    return res.status(400).json({
      code: 400,
      success: false,
      message: "Verification link is invalid or has expired.",
    });
  }
};

// Resends verification email, enforcing DB-level max limits and cooldown timers.
export const resendVerification = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors);
  }

  const { email } = req.body;
  const normalizedEmail = normalizeEmailAddress(email);

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(200).json({
        code: 200,
        success: true,
        message: GENERIC_RESEND_MESSAGE,
      });
    }

    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
    if (!pendingUser) {
      return res.status(200).json({
        code: 200,
        success: true,
        message: GENERIC_RESEND_MESSAGE,
      });
    }

    const now = new Date();
    const resendWindowStartedAt = pendingUser.resendWindowStartedAt;
    if (resendWindowStartedAt && now - resendWindowStartedAt >= RESEND_LIMIT_WINDOW_MS) {
      pendingUser.resendCount = 0;
      pendingUser.resendWindowStartedAt = null;
    }

    // Exhaustion check (Max 2 resends per rolling 24-hour window)
    if (pendingUser.resendCount >= 2) {
      return res.status(429).json({
        code: 429,
        success: false,
        message: RESEND_LIMIT_REACHED_MESSAGE,
      });
    }

    // 60 second cooldown check between resends
    if (now - pendingUser.lastResentAt < RESEND_COOLDOWN_MS) {
      return res.status(200).json({
        code: 200,
        success: true,
        message: GENERIC_RESEND_MESSAGE,
      });
    }

    const verificationToken = createVerificationTokenPair();

    pendingUser.verificationToken = null;
    pendingUser.verificationTokenHash = verificationToken.tokenHash;
    pendingUser.verificationTokenExpiresAt = verificationToken.expiresAt;
    pendingUser.resendWindowStartedAt ??= now;
    pendingUser.resendCount += 1;
    pendingUser.lastResentAt = now;
    pendingUser.createdAt = now;
    await pendingUser.save();

    const magicLink = buildVerificationLink(verificationToken.token);
    sendVerificationEmail(normalizedEmail, magicLink).catch((err) => {
      console.error(`[Email Delivery Error] Failed to send email to ${normalizedEmail}:`, err.message);
    });

    res.status(200).json({
      code: 200,
      success: true,
      message: GENERIC_RESEND_MESSAGE,
    });
  } catch (err) {
    console.error("Resend verification failed:", err.message);
    res.status(500).json({
      code: 500,
      success: false,
      message: "Server Error",
    });
  }
};

// Starts the password reset flow while keeping account existence private.
export const requestPasswordReset = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors);
  }

  const normalizedEmail = normalizeEmailAddress(req.body.email);

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(200).json({
        code: 200,
        success: true,
        message: GENERIC_PASSWORD_RESET_MESSAGE,
      });
    }

    const resetToken = createVerificationTokenPair();
    user.resetPasswordTokenHash = resetToken.tokenHash;
    user.resetPasswordExpiresAt = resetToken.expiresAt;
    await user.save();

    const resetLink = buildPasswordResetLink(resetToken.token);
    sendPasswordResetEmail(normalizedEmail, resetLink).catch((err) => {
      console.error(`[Email Delivery Error] Failed to send password reset email to ${normalizedEmail}:`, err.message);
    });

    return res.status(200).json({
      code: 200,
      success: true,
      message: GENERIC_PASSWORD_RESET_MESSAGE,
    });
  } catch (err) {
    console.error("Forgot password failed:", err.message);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Server Error",
    });
  }
};

// Resets a password after validating a time-limited reset token.
export const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors);
  }

  const { token, password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordTokenHash: hashVerificationToken(token),
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Password reset link is invalid or has expired.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordChangedAt = new Date();
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    return res.status(200).json({
      code: 200,
      success: true,
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    });
  } catch (err) {
    console.error("Password reset failed:", err.message);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "Server Error",
    });
  }
};

// Authenticates user credentials and issues a JWT token.
export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors);
  }

  const { email, password } = req.body;
  const normalizedEmail = normalizeEmailAddress(email);

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
      if (pendingUser?.password) {
        const pendingPasswordMatches = await bcrypt.compare(password, pendingUser.password);
        if (pendingPasswordMatches) {
          return res.status(401).json({
            code: 401,
            success: false,
            message: "Your email verification is pending. Please verify your email to log in.",
          });
        }
      }
      return res.status(401).json({
        code: 401,
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        code: 401,
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        code: 401,
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.deactivated) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }
    return issueAuthenticatedSession(user, res);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      code: 500,
      success: false,
      message: "Server Error",
    });
  }
};

export const authenticateWithGoogle = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors);
  }

  const credential = String(req.body?.credential ?? "").trim();
  if (!credential) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "Google credential is required.",
    });
  }

  try {
    const identity = await googleIdentity.verifyCredential(credential);

    if (!identity.emailVerified || !identity.email || !identity.sub) {
      return res.status(401).json({
        code: 401,
        success: false,
        message: GOOGLE_EMAIL_VERIFICATION_MESSAGE,
      });
    }

    const normalizedEmail = normalizeEmailAddress(identity.email);
    if (!isAllowedAccountEmail(normalizedEmail)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Use a Gmail or educational email address.",
      });
    }
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.deactivated) {
        return res.status(403).json({
          code: 403,
          success: false,
          message: "Your account has been deactivated. Please contact support.",
        });
      }

      if (existingUser.google?.sub && existingUser.google.sub !== identity.sub) {
        return res.status(409).json({
          code: 409,
          success: false,
          message: GOOGLE_ACCOUNT_LINK_CONFLICT_MESSAGE,
        });
      }

      const profileName = String(existingUser.profile?.name ?? "").trim().toLowerCase();
      if (identity.name && (!profileName || profileName === normalizedEmail)) {
        existingUser.profile ??= {};
        existingUser.profile.name = identity.name;
      }
      existingUser.google = buildGoogleMetadata(identity, existingUser.google);
      existingUser.isVerified = true;
      return issueAuthenticatedSession(existingUser, res, "Logged in successfully");
    }

    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
    if (pendingUser) {
      const promotedUser = new User({
        email: normalizedEmail,
        // Pending registration data may belong to someone else. Trust only the
        // verified Google identity; email sign-in can be added by password reset.
        password: null,
        profile: identity.name ? { name: identity.name } : {},
        google: buildGoogleMetadata(identity),
        isVerified: true,
      });

      await promotedUser.save();
      await PendingUser.deleteOne({ email: normalizedEmail });
      clearPendingRegistrationCookie(res);
      return issueAuthenticatedSession(promotedUser, res, "Logged in successfully");
    }

    const newUser = new User({
      email: normalizedEmail,
      password: null,
      profile: identity.name
        ? {
          name: identity.name,
        }
        : {},
      google: buildGoogleMetadata(identity),
      isVerified: true,
    });

    return issueAuthenticatedSession(newUser, res, "Logged in successfully");
  } catch (error) {
    console.error("Google authentication failed:", error.message);
    return res.status(401).json({
      code: 401,
      success: false,
      message: GOOGLE_AUTH_FAILURE_MESSAGE,
    });
  }
};

// Invalidates the current user token by adding it to a blacklist.
export const logout = async (req, res) => {
  try {
    const token = getRequestAuthToken(req);
    if (token) {
      await BlacklistedToken.create({ token, expiresAt: getTokenExpiresAt(token) }).catch(() => null);
    }
    clearAuthCookie(res);

    res.status(200).json({
      code: 200,
      success: true,
      message: "Logged out successfully!",
    });
  } catch (error) {
    console.log("Error in Logging out!", error.message);
    res.status(500).json({
      code: 500,
      success: false,
      message: "Logout Failed!",
    });
  }
};
