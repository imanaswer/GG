import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "path";
import { defineConfig } from "@prisma/config";

// Load .env.local so DATABASE_URL / DIRECT_URL resolve in local development.
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

// Prefer the direct (non-pooled) URL for migrations. Fall back to DATABASE_URL.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
