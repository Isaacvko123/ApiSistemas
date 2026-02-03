import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { hashPassword } from "./hash";

export async function ensureBootstrapAdmin(): Promise<void> {
  if (!env.bootstrapAdminEnabled) return;

  const nombre = env.bootstrapAdminName;
  const email = env.bootstrapAdminEmail;
  const password = env.bootstrapAdminPassword;
  const rol = env.bootstrapAdminRole;

  if (!nombre || !email || !password) {
    throw new Error("Faltan variables de bootstrap admin en .env");
  }

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    console.log("[BOOTSTRAP] Admin ya existe, se omite creación.");
    return;
  }

  const hashed = await hashPassword(password);

  await prisma.usuario.create({
    data: {
      nombre,
      email,
      contrasena: hashed,
      rol,
      activo: true,
      tokenVersion: 0,
    },
  });

  console.log("[BOOTSTRAP] Admin creado:", email);
}
