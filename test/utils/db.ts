import { Prisma } from "@prisma/client";
import { prisma } from "../../src/db/prisma";

export async function truncateAll(): Promise<void> {
  const dbInfo = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT current_database() as name",
  );
  const dbName = dbInfo[0]?.name?.toLowerCase() ?? "";
  if (!dbName.includes("test")) {
    throw new Error(`Refusing to truncate non-test database: ${dbName}`);
  }

  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'",
  );

  if (tables.length === 0) return;

  const names = tables.map((t) => `"${t.tablename}"`).join(", ");

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isDeadlock =
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010") ||
        message.includes("40P01") ||
        message.toLowerCase().includes("deadlock");

      if (!isDeadlock || attempt === maxRetries - 1) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
