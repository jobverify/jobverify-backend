import assert from "node:assert/strict";
import test from "node:test";
import {
  createVerificationTokenPair,
  hashVerificationToken,
  isStrongPassword,
  normalizeEmailAddress,
} from "../src/utils/authSecurity.js";

test("normalizeEmailAddress trims and lowercases emails", () => {
  assert.equal(
    normalizeEmailAddress("  Student.User+jobs@Example.COM  "),
    "student.user+jobs@example.com",
  );
});

test("isStrongPassword accepts long mixed-character passwords", () => {
  assert.equal(isStrongPassword("Password123!"), true);
  assert.equal(isStrongPassword("short1!"), false);
  assert.equal(isStrongPassword("alllowercase123!"), false);
  assert.equal(isStrongPassword("ALLUPPERCASE123!"), false);
  assert.equal(isStrongPassword("MissingNumber!"), false);
});

test("hashVerificationToken is deterministic and does not echo the raw token", () => {
  const rawToken = "plain-verification-token";
  const tokenHash = hashVerificationToken(rawToken);

  assert.equal(tokenHash, hashVerificationToken(rawToken));
  assert.notEqual(tokenHash, rawToken);
});

test("createVerificationTokenPair returns a raw token plus a stored hash", () => {
  const pair = createVerificationTokenPair();

  assert.equal(typeof pair.token, "string");
  assert.equal(pair.token.length > 20, true);
  assert.equal(pair.tokenHash, hashVerificationToken(pair.token));
});
