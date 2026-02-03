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
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
