import crypto from "crypto";
import { prisma } from "../../src/db/prisma";
import { signAccessToken } from "../../src/seguridad/jwt";
import { toUsuarioCreateData } from "../../src/models/Usuario/UsuarioModel";

export async function createAdminAuth() {
  const data = await toUsuarioCreateData({
    nombre: "Admin",
    email: `admin-${crypto.randomUUID()}@empresa.com`,
    contrasena: "PasswordSegura123",
    rol: "ADMIN",
  });

  const user = await prisma.usuario.create({ data });

  const sessionId = crypto.randomUUID();
  await prisma.sesion.create({
    data: {
      id: sessionId,
      usuarioId: user.id,
      refreshHash: "test",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      lastUsedAt: new Date(),
    },
  });

  const token = signAccessToken({
    sub: String(user.id),
    rol: "ADMIN",
    tv: user.tokenVersion,
    sid: sessionId,
  });

  return { token, user, sessionId };
}
