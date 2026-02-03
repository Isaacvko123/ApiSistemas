import { prisma } from "../db/prisma";
import { rotateCredencialIfNeeded } from "../models/Credenciales/CredencialWebModel";

export async function rotateAllCredencialesWeb(): Promise<number> {
  const rows = await prisma.credencialWeb.findMany();
  let rotated = 0;

  for (const row of rows) {
    const update = rotateCredencialIfNeeded(row);
    if (!update) continue;
    await prisma.credencialWeb.update({
      where: { id: row.id },
      data: update,
    });
    rotated += 1;
  }

  return rotated;
}
