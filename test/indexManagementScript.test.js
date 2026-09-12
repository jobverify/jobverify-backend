import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
