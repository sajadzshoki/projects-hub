import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A package-lock.json in the user home folder was making Next treat that folder as the app root.
  outputFileTracingRoot: path.join(process.cwd()),
  // Keep native driver packages out of the bundler — they are used server-side only.
  serverExternalPackages: ["mongodb", "minio", "mongodb-memory-server"],
};

export default nextConfig;
