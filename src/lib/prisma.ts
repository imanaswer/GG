import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createMockPrismaClient } from "./prisma-mock";
import { cookies } from "next/headers";
import { verifyToken, COOKIE } from "./auth";
import { isPlaceholderUrl, DEMO_EMAIL, DEMO_USERNAME } from "./dbMode";

const globalForPrisma = globalThis as unknown as {
  realClient?: PrismaClient;
  mockClient?: PrismaClient;
};

// 1. Export the explicit mock client (used explicitly in login route)
export const mockClient = (globalForPrisma.mockClient ?? createMockPrismaClient()) as unknown as PrismaClient;
if (process.env.NODE_ENV !== "production") globalForPrisma.mockClient = mockClient;

// Empty stub client for when no database is connected and it's not the dummy user
const emptyClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (prop === "$transaction") return async (ops: any) => typeof ops === 'function' ? ops(emptyClient) : [];
    if (prop === "$connect" || prop === "$disconnect") return async () => {};
    if (prop === "$queryRaw" || prop === "$executeRaw") return async () => [];
    return new Proxy({}, {
      get(_model, method) {
        return async () => {
          if (typeof method === "string") {
            if (method.startsWith("findMany")) return [];
            if (method === "count") return 0;
            if (method.startsWith("find")) return null;
            if (method === "aggregate") return { _count: { _all: 0 } };
            if (method === "groupBy") return [];
          }
          return null;
        }
      }
    });
  }
});

// 2. Export the explicit real client
export const realClient = (() => {
  if (globalForPrisma.realClient) return globalForPrisma.realClient;

  const dbUrl = process.env.DATABASE_URL ?? "";
  
  // max: 1 — one connection per serverless instance, so a burst of Vercel
  // lambdas can't exhaust Postgres/Supabase connection limits.
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  const adapter = new PrismaPg(pool);
  
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.realClient = client;
  return client;
})();

// 3. Resolve dynamically based on session
async function resolveClient(): Promise<PrismaClient> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (token) {
      const payload = await verifyToken(token);
      // Route queries to mock DB if it's the demo account
      if (payload?.email === DEMO_EMAIL || payload?.username === DEMO_USERNAME) {
        return mockClient;
      }
    }
    
    // Also route to mock DB if the user is logged into the admin dashboard AND there's no real DB
    const adminToken = jar.get("gg_admin")?.value;
    if (adminToken) {
      const adminPayload = await verifyToken(adminToken).catch(() => null) || await import("./adminAuth").then(m => m.verifyAdminToken(adminToken)).catch(() => null);
      if (adminPayload?.email === "testadmin@gameground.com") {
        const dbUrl = process.env.DATABASE_URL ?? "";
        if (!dbUrl || isPlaceholderUrl(dbUrl)) {
          return mockClient;
        }
      }
    }
  } catch {
    // Fails silently if called outside a Next.js request context
  }
  return realClient;
}

// 4. The Smart Proxy
//
// The client can only be resolved asynchronously (it depends on the request's
// cookies), so each query is returned as a lazy, memoized thenable that picks
// the right client on first await. Each lazy query also carries its
// {model, method, args} so that array-form $transaction can rebuild *real*
// PrismaPromises on the resolved client — a plain thenable is not a
// PrismaPromise and would break (or de-atomicise) prisma.$transaction([...]).
type LazyMeta = { model: string; method: string; args: any[] };

function makeLazy(run: () => Promise<any>, meta?: LazyMeta) {
  let p: Promise<any> | undefined;
  const exec = () => (p ??= run()); // memoised: run the query at most once
  return {
    __lazyQuery: meta,
    then: (resolve: any, reject?: any) => exec().then(resolve, reject),
    catch: (reject: any) => exec().catch(reject),
    finally: (cb: any) => exec().finally(cb),
  };
}

// Rebuild array-form $transaction operations as real promises on the resolved
// client. Exported for testing. Elements that aren't lazy queries (defensive)
// are passed through untouched.
export function rebuildTxOps(client: any, ops: any[]): any[] {
  return ops.map((op) =>
    op && op.__lazyQuery
      ? client[op.__lazyQuery.model][op.__lazyQuery.method](...op.__lazyQuery.args)
      : op,
  );
}

const SPECIAL_PROPS = ["$transaction", "$connect", "$disconnect", "$queryRaw", "$executeRaw"];

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, modelOrProp) {
    if (typeof modelOrProp === "string" && SPECIAL_PROPS.includes(modelOrProp)) {
      return (...args: any[]) =>
        makeLazy(async () => {
          const client = (await resolveClient()) as any;
          if (modelOrProp === "$transaction" && Array.isArray(args[0])) {
            return client.$transaction(rebuildTxOps(client, args[0]), ...args.slice(1));
          }
          return client[modelOrProp](...args);
        });
    }

    return new Proxy({}, {
      get(_modelTarget, method) {
        if (typeof method !== "string") return undefined;
        return (...args: any[]) =>
          makeLazy(
            async () => {
              const client = (await resolveClient()) as any;
              return client[modelOrProp as string][method](...args);
            },
            { model: modelOrProp as string, method, args },
          );
      },
    });
  },
});
