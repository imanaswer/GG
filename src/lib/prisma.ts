import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createMockPrismaClient } from "./prisma-mock";
import { cookies } from "next/headers";
import { verifyToken, COOKIE } from "./auth";

const globalForPrisma = globalThis as unknown as { 
  realClient?: PrismaClient;
  mockClient?: PrismaClient;
};

function isPlaceholderUrl(url: string): boolean {
  return (
    url.includes("placeholder") ||
    url.includes("password@localhost") ||
    url.includes("example") ||
    url === ""
  );
}

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
  
  if (!dbUrl || isPlaceholderUrl(dbUrl)) {
    // If no real DB URL provided yet, fallback to the EMPTY client.
    // This ensures public visitors see no data, while the dummy user gets mockClient.
    return emptyClient;
  }
  
  const adapter = new PrismaPg({ connectionString: dbUrl, max: 1 });
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
      // Route queries to mock DB if it's the test account
      if (payload?.email === "test@gameground.net" || payload?.username === "testplayer") {
        return mockClient;
      }
    }
  } catch {
    // Fails silently if called outside a Next.js request context
  }
  return realClient;
}

// 4. The Smart Proxy
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, modelOrProp) {
    if (typeof modelOrProp === "string" && ["$transaction", "$connect", "$disconnect", "$queryRaw", "$executeRaw"].includes(modelOrProp)) {
      return (...args: any[]) => {
         return {
           then: async (resolve: any, reject: any) => {
             try {
               const client = await resolveClient();
               resolve(await (client as any)[modelOrProp](...args));
             } catch(e) { reject(e); }
           }
         }
      }
    }

    return new Proxy({}, {
      get(_modelTarget, method) {
        return (...args: any[]) => {
          return {
            then: async (resolve: any, reject: any) => {
              try {
                const client = await resolveClient();
                resolve(await (client as any)[modelOrProp][method](...args));
              } catch(e) { reject(e); }
            },
            catch: async (reject: any) => {
              try {
                const client = await resolveClient();
                await (client as any)[modelOrProp][method](...args);
              } catch(e) { reject(e); }
            }
          }
        }
      }
    });
  }
});
