import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(testDir, "..");

test("index management can be imported without a configured database URI", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", 'await import("./scripts/indexes.js")'],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        MONGO_URI: "",
      },
      encoding: "utf8",
    },
  );

  assert.equal(
    result.status,
    0,
    `Expected a side-effect-free import.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});

test("managed index planning includes the user suggestion quota indexes", () => {
  const source = fs.readFileSync(
    path.join(backendDir, "scripts", "indexes.js"),
    "utf8",
  );

  assert.match(source, /models\/UserSuggestion\.js/);
  assert.match(source, /\["UserSuggestion", UserSuggestion\]/);
});
