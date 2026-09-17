#!/usr/bin/env node
/**
 * Installs local git hooks that block agent authors and strip agent Co-authored-by trailers.
 * Run after clone: npm run hooks:install
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hooksSourceDir = join(root, "scripts", "git-hooks");
const hookNames = ["commit-msg", "pre-push"];

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
mkdirSync(hooksDir, { recursive: true });

for (const name of hookNames) {
  const source = join(hooksSourceDir, name);
  if (!existsSync(source)) {
    console.error(`Missing hook source: ${source}`);
    process.exit(1);
  }
  const dest = join(hooksDir, name);
  copyFileSync(source, dest);
  chmodSync(dest, 0o755);
  console.log(`Installed ${name} hook → ${dest}`);
}

// Prefer human identity in this clone when still using cloud-agent globals.
try {
  const email = execSync("git config --get user.email", {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (/cursoragent|@cursor\.com/i.test(email)) {
    execSync('git config user.name "Wesley Luther"', { cwd: root });
    execSync('git config user.email "wesleyluther830@gmail.com"', {
      cwd: root,
    });
    console.log(
      "Local user.name/email were agent defaults; set to Wesley Luther <wesleyluther830@gmail.com>.",
    );
  }
} catch {
  // No user.email yet — set local team identity.
  execSync('git config user.name "Wesley Luther"', { cwd: root });
  execSync('git config user.email "wesleyluther830@gmail.com"', { cwd: root });
  console.log(
    "Set local user.name/email to Wesley Luther <wesleyluther830@gmail.com>.",
  );
}

console.log(
  "Hooks ready: agent Co-authored-by stripped; agent author/committer blocked on commit+push.",
);
