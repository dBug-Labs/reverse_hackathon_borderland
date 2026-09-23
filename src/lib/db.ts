import { MongoClient, Db } from 'mongodb';
import { getEnv } from './env';

/**
 * Cached MongoDB client singleton.
 *
 * In development we store the client promise on `globalThis` so that
 * HMR doesn't create a new connection on every reload.
 * In production each cold-start creates one client that is reused
 * across all subsequent invocations of the same Vercel instance.
 */

const options = {
  maxPoolSize: 10,
};

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = getEnv().MONGODB_URI;

  // A failed connect must not stay cached, or a warm instance keeps failing
  // (e.g. after an Atlas IP-allowlist change) until it is recycled.
  const connect = (onFail: () => void) =>
    new MongoClient(uri, options).connect().catch((err) => {
      onFail();
      throw err;
    });

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = connect(() => {
        global._mongoClientPromise = undefined;
      });
    }
    return global._mongoClientPromise;
  }

  // Production: create once per cold-start
  if (!clientPromise) {
    clientPromise = connect(() => {
      clientPromise = undefined as unknown as Promise<MongoClient>;
    });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db('borderland');
}

/**
 * Convenience: get the underlying MongoClient (needed for transactions).
 */
export async function getClient(): Promise<MongoClient> {
  return getClientPromise();
}
