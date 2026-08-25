import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native driver packages out of the bundler — they are used server-side only.
  serverExternalPackages: ["mongodb", "minio", "mongodb-memory-server"],
};

export default nextConfig;
