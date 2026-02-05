import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaPool: Pool | undefined;
}

const log: Prisma.LogDefinition[] =
  env.nodeEnv === "development"
    ? [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "warn" },
        { emit: "stdout", level: "error" },
      ]
    : [{ emit: "stdout", level: "warn" }, { emit: "stdout", level: "error" }];

const pool =
  globalThis.prismaPool ??
  new Pool({
    connectionString: env.databaseUrl,
  });

if (env.nodeEnv !== "production") {
  globalThis.prismaPool = pool;
}

const createPrismaClient = () =>
  new PrismaClient({
    log,
    adapter: new PrismaPg(pool),
  });

export const prisma = globalThis.prisma ?? createPrismaClient();

if (env.nodeEnv !== "production") {
  prisma.$on("query", (e) => {
    if (e.duration >= env.slowQueryMs) {
      console.warn(`[SLOW QUERY] ${e.duration}ms ${e.query}`);
    }
  });
}

if (env.nodeEnv !== "production") {
  globalThis.prisma = prisma;
}
