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

function connectMongo(uri: string): Promise<MongoClient> {
  const client = new MongoClient(uri);
  const connecting = client.connect().catch((error: unknown) => {
    if (global._projectHubMongo === connecting) global._projectHubMongo = undefined;
    throw error;
  });
  return connecting;
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured. Add it to your .env file (see .env.example).");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!global._projectHubMongo) global._projectHubMongo = connectMongo(uri);
    try {
      const client = await global._projectHubMongo;
      const db = client.db();
      await db.command({ ping: 1 });
      return db;
    } catch (error) {
      global._projectHubMongo = undefined;
      lastError = error;
    }
  }

  throw lastError;
}
