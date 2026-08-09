import assert from "node:assert/strict";
import test from "node:test";

test("verifyGoogleCredential rejects when GOOGLE_CLIENT_ID is missing", async () => {
  const moduleOrError = await import("../src/utils/googleAuth.js").catch((error) => ({ error }));

  assert.equal(
    "error" in moduleOrError,
    false,
    moduleOrError.error?.message ?? "googleAuth.js should load for this test",
  );

  const { verifyGoogleCredential } = moduleOrError;

  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;

  try {
    await assert.rejects(
      () => verifyGoogleCredential("header.payload.signature"),
      /GOOGLE_CLIENT_ID/,
    );
  } finally {
    if (originalClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    }
  }
});
