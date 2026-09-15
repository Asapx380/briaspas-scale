#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hooksPath = join(root, ".githooks");

if (!existsSync(hooksPath)) {
  console.error("scripts/install-git-hooks: pasta .githooks ausente");
  process.exit(1);
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit",
});

console.log("Git hooks ativos em .githooks (bloqueia Co-authored-by Cursor).");
