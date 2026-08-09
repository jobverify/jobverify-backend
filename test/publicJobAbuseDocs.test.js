import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("README explains public job abuse protection on Render Free", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /PUBLIC_JOB_ABUSE_PAGE_WALK_WINDOW_MS/);
  assert.match(readme, /PUBLIC_JOB_ABUSE_PAGE_WALK_LIMIT/);
  assert.match(readme, /PUBLIC_JOB_ABUSE_DETAIL_WINDOW_MS/);
  assert.match(readme, /PUBLIC_JOB_ABUSE_DETAIL_LIMIT/);
  assert.match(readme, /PUBLIC_JOB_ABUSE_VIOLATION_WINDOW_MS/);
  assert.match(readme, /PUBLIC_JOB_ABUSE_VIOLATION_LIMIT/);
  assert.match(readme, /PUBLIC_JOB_ABUSE_BLOCK_MS/);
  assert.match(readme, /PUBLIC_JOB_ABUSE_MAX_RECORDS/);
  assert.match(readme, /Retry-After/i);
  assert.match(readme, /TRUST_PROXY/);
  assert.match(readme, /Render Free/i);
  assert.match(readme, /restart|spin-down/i);
  assert.match(readme, /Cloudflare|WAF/i);
});
