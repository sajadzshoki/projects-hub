import { MongoClient, type Db } from "mongodb";

/**
 * MongoDB singleton for Next.js — in dev the module registry is cleared on every
 * request, so we cache the client promise on `globalThis` to avoid opening a new
 * connection pool each time.
 */

declare global {
  // eslint-disable-next-line no-var
  var _projectHubMongo: Promise<MongoClient> | undefined;
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured. Add it to your .env file (see .env.example).");
  }

  if (!global._projectHubMongo) {
    const client = new MongoClient(uri);
    global._projectHubMongo = client.connect();
  }

  const client = await global._projectHubMongo;
  return client.db();
}
