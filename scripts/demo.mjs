#!/usr/bin/env node
/**
 * Zero-setup demo: spins up a throwaway in-memory MongoDB, seeds it with demo
 * projects and starts `next dev` against it.
 *
 *   npm run dev:demo
 *
 * Useful for trying Project Hub without installing MongoDB locally.
 */
import { spawn } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";
import { seed } from "./seed.mjs";

const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri("project-hub");
console.log(`[demo] In-memory MongoDB ready → ${uri}`);

const inserted = await seed(uri, true);
if (inserted > 0) console.log(`[demo] Seeded ${inserted} demo project(s)`);

const child = spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", "3000"], {
  stdio: "inherit",
  env: {
    ...process.env,
    MONGODB_URI: uri,
    PROJECT_HUB_PASSWORD: process.env.PROJECT_HUB_PASSWORD || "1111",
  },
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  child.kill("SIGTERM");
}

child.on("exit", async () => {
  console.log("[demo] Next dev stopped — shutting down in-memory MongoDB");
  await mongod.stop();
  process.exit(0);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
