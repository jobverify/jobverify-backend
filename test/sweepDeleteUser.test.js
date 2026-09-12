import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = new URL("../scripts/sweepDeleteUser.js", import.meta.url).href;

test("failed user maintenance exits unsuccessfully and still disconnects the database", () => {
  const harness = `
    import { registerHooks } from "node:module";
    process.env.NODE_ENV = "test";
    process.argv[2] = "fixture@gmail.com";
    registerHooks({
      resolve(specifier, context, next) {
        if (specifier === "dotenv") return { url: "fixture:dotenv", shortCircuit: true };
        if (specifier === "mongoose") return { url: "fixture:mongoose", shortCircuit: true };
        if (specifier.endsWith("/db/db.js")) return { url: "fixture:database", shortCircuit: true };
        if (/models\\/(User|PendingUser|Subscription|Click)\\.js$/.test(specifier)) {
          return { url: "fixture:model", shortCircuit: true };
        }
        return next(specifier, context);
      },
      load(url, context, next) {
        const sources = {
          "fixture:dotenv": "export default {config(){}};",
          "fixture:mongoose": "export default {async disconnect(){console.log('fixture-disconnected')}};",
          "fixture:database": "export default async function() {};",
          "fixture:model": "export default {async deleteMany(){throw new Error('fixture database failure')}};",
        };
        if (url in sources) return { format: "module", source: sources[url], shortCircuit: true };
        return next(url, context);
      },
    });
    await import(${JSON.stringify(script)});
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", harness], {
    encoding: "utf8", windowsHide: true, timeout: 15_000,
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /fixture database failure/);
  assert.match(result.stdout, /fixture-disconnected/);
});
