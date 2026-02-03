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

const log: Prisma.LogLevel[] =
  env.nodeEnv === "development"
    ? ["query", "warn", "error"]
    : ["warn", "error"];

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
  globalThis.prisma = prisma;
}
