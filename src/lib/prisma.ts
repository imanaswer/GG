import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = (() => {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const dbUrl = process.env.DATABASE_URL ?? "";
  // max: 1 — one connection per serverless instance, so a burst of Vercel
  // lambdas can't exhaust Postgres/Supabase connection limits.
  const pool = new Pool({ connectionString: dbUrl, max: 1 });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
})();
