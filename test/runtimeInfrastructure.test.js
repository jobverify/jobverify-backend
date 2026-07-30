import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import connectDB from "../db/db.js";
import {
  createOriginAllowlist,
  normalizeOrigin,
} from "../src/utils/originAllowlist.js";

test("connectDB rethrows connection errors instead of exiting the process", async () => {
  const originalConnect = mongoose.connect;
  const originalExit = process.exit;
  const exitCalls = [];

  mongoose.connect = async () => {
    throw new Error("atlas unavailable");
  };

  process.exit = (code) => {
    exitCalls.push(code);
  };

  try {
    await assert.rejects(connectDB(), /atlas unavailable/);
    assert.deepEqual(exitCalls, []);
  } finally {
    mongoose.connect = originalConnect;
    process.exit = originalExit;
  }
});

test("resolvePublicApiOrigin treats the backend public origin as optional", async () => {
  const { resolvePublicApiOrigin } = await import("../src/utils/runtimeConfig.js");

  assert.equal(
    resolvePublicApiOrigin({
      PUBLIC_API_ORIGIN: "",
      API_PUBLIC_ORIGIN: "",
      BACKEND_PUBLIC_ORIGIN: "",
    }),
    "",
  );
});

test("normalizeOrigin returns an empty string for invalid values", () => {
  assert.equal(normalizeOrigin(""), "");
  assert.equal(normalizeOrigin("ftp://localhost:5000"), "");
  assert.equal(normalizeOrigin("not-a-url"), "");
});

test("createOriginAllowlist matches configured origins exactly by default", () => {
  const allowlist = createOriginAllowlist(["http://localhost:5173"]);

  assert.equal(allowlist.has("http://localhost:5173"), true);
  assert.equal(allowlist.has("http://127.0.0.1:4173"), false);
  assert.equal(allowlist.has("https://app.jobify.test"), false);
});

test("createOriginAllowlist accepts loopback origin variants in development mode", () => {
  const allowlist = createOriginAllowlist(["http://localhost:5173"], {
    allowDevLoopback: true,
  });

  assert.equal(allowlist.has("http://127.0.0.1:4173"), true);
  assert.equal(allowlist.has("http://[::1]:4173"), true);
  assert.equal(allowlist.has("https://127.0.0.1:4173"), false);
  assert.equal(allowlist.has("https://localhost:4173"), false);
  assert.equal(allowlist.has("https://evil.example"), false);
});
