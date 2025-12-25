#!/usr/bin/env node

const { spawnSync } = require("child_process");

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error("Usage: with-db-env <command> [args...]");
  process.exit(1);
}

const env = { ...process.env };

if (!env.DATABASE_URL) {
  env.DATABASE_URL = env.POSTGRES_PRISMA_URL || env.POSTGRES_URL || "";
}

const result = spawnSync(command, args, {
  stdio: "inherit",
  env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
