import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import connectDB from "../db/db.js";
import {
  createOriginAllowlist,
  normalizeOrigin,
} from "../src/utils/originAllowlist.js";
import { resolveFrontendOrigin } from "../src/utils/runtimeConfig.js";

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

test("createOriginAllowlist matches configured non-loopback origins exactly by default", () => {
  const allowlist = createOriginAllowlist(["https://app.jobverify.test"]);

  assert.equal(allowlist.has("https://app.jobverify.test"), true);
  assert.equal(allowlist.has("https://admin.jobverify.test"), false);
});

test("createOriginAllowlist ignores configured loopback origins outside development mode", () => {
  const allowlist = createOriginAllowlist([
    "http://localhost:5173",
    "https://app.jobverify.test",
  ]);

  assert.equal(allowlist.has("http://localhost:5173"), false);
  assert.equal(allowlist.has("http://127.0.0.1:4173"), false);
  assert.equal(allowlist.has("https://app.jobverify.test"), true);
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

test("resolveFrontendOrigin skips loopback entries in production", () => {
  assert.equal(
    resolveFrontendOrigin({
      NODE_ENV: "production",
      FRONTEND_ORIGIN: "http://localhost:5173,https://jobverify.in",
      CORS_ORIGIN: "https://jobverify.in,https://jobverifyin.vercel.app",
    }),
    "https://jobverify.in",
  );
});

test("resolveFrontendOrigin keeps loopback entries during development", () => {
  assert.equal(
    resolveFrontendOrigin({
      NODE_ENV: "development",
      FRONTEND_ORIGIN: "http://localhost:5173,https://jobverify.in",
    }),
    "http://localhost:5173",
  );
});
