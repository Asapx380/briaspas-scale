#!/usr/bin/env node
/**
 * Installs local git hooks (commit-msg) that strip agent Co-authored-by trailers.
 * Run after clone: npm run hooks:install
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "scripts", "git-hooks", "commit-msg");

function gitDir() {
  try {
    return execSync("git rev-parse --git-dir", {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    console.error("Not a git repository; skipping hooks install.");
    process.exit(0);
  }
}

const hooksDir = join(root, gitDir(), "hooks");
if (!existsSync(source)) {
  console.error(`Missing hook source: ${source}`);
  process.exit(1);
}

mkdirSync(hooksDir, { recursive: true });
const dest = join(hooksDir, "commit-msg");
copyFileSync(source, dest);
chmodSync(dest, 0o755);
console.log(`Installed commit-msg hook → ${dest}`);
console.log("Agent Co-authored-by trailers will be stripped on commit.");
