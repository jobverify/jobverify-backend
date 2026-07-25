import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([
  "node_modules",
  ".git",
  ".cache",
  ".codex",
  ".superpowers",
  "coverage",
  "fixtures",
  "playwright-report",
  "test-results",
  "tmp",
]);
const jsFiles = [];

function collectJsFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const relativePath = path.relative(root, fullPath);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (!ignoredDirs.has(entry)) collectJsFiles(fullPath);
      continue;
    }

    if (stats.isFile() && entry.endsWith(".js")) {
      jsFiles.push(relativePath);
    }
  }
}

collectJsFiles(root);

let failed = false;
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`Checked syntax for ${jsFiles.length} JavaScript files.`);
}
