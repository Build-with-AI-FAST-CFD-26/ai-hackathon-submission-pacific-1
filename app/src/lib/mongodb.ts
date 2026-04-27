import { MongoClient, type Db } from "mongodb";
import { hasMongoConfig, serverEnv } from "@/lib/env";

declare global {
  var __syncMongoClientPromise__: Promise<MongoClient> | undefined;
  var __syncMongoFailureLogged__: boolean | undefined;
}

function clearBrokenLoopbackProxyEnv() {
  const proxyKeys = [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
  ] as const;

  for (const key of proxyKeys) {
    const value = process.env[key];
    if (value?.includes("127.0.0.1:9") || value?.includes("localhost:9")) {
      delete process.env[key];
    }
  }
}

function createClientPromise() {
  clearBrokenLoopbackProxyEnv();
  const client = new MongoClient(serverEnv.MONGODB_URI as string, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  return client.connect();
}

async function getClient() {
  if (!hasMongoConfig) {
    return null;
  }

  if (!global.__syncMongoClientPromise__) {
    global.__syncMongoClientPromise__ = createClientPromise().catch((error) => {
      global.__syncMongoClientPromise__ = undefined;
      throw error;
    });
  }

  try {
    return await global.__syncMongoClientPromise__;
  } catch (error) {
    if (!global.__syncMongoFailureLogged__) {
      console.error("MongoDB connection failed. Falling back to empty live mode.", error);
      global.__syncMongoFailureLogged__ = true;
    }
    return null;
  }
}

export async function getDb(): Promise<Db | null> {
  const client = await getClient();
  return client ? client.db(serverEnv.MONGODB_DB_NAME) : null;
}
