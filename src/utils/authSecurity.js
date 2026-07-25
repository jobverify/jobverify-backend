import crypto from "node:crypto";

export const PASSWORD_MIN_LENGTH = 10;
export const VERIFICATION_TOKEN_TTL_MS = 30 * 60 * 1000;

const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{10,}$/;

export const normalizeEmailAddress = (value) =>
  String(value ?? "").trim().toLowerCase();

export const isStrongPassword = (value) =>
  PASSWORD_POLICY.test(String(value ?? ""));

export const hashOpaqueToken = (value) =>
  crypto.createHash("sha256").update(String(value ?? "")).digest("hex");

export const hashVerificationToken = (value) =>
  hashOpaqueToken(value);

export const createOpaqueToken = () =>
  crypto.randomBytes(32).toString("hex");

export const createVerificationTokenPair = () => {
  const token = createOpaqueToken();

  return {
    token,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  };
};

export const isJwtSecretStrong = (value) =>
  String(value ?? "").trim().length >= 32;
