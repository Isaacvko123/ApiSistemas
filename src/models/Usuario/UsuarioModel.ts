import { z } from "zod";
import { type Prisma, type Usuario } from "@prisma/client";
import { hashPassword } from "../../seguridad/hash";

/**
 * Modelo de dominio para Usuario.
 * Incluye:
 * - Schemas Zod para validar payloads (crear/actualizar).
 * - Tipos públicos para respuestas (sin campos sensibles).
 * - Helpers para transformar datos y hashear contraseñas.
 */

/**
 * Schema de creación de usuario.
 * Reglas:
 * - nombre: 2-100
 * - email: válido
 * - contrasena: 10-200 (se hashea con Argon2)
 * - rol: ADMIN | SUPERVISOR | GERENTE (default SUPERVISOR)
 */
export const usuarioCreateSchema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email(),
  contrasena: z.string().min(10).max(200),
  rol: z.enum(["ADMIN", "SUPERVISOR", "GERENTE"]).default("SUPERVISOR"),
});

/**
 * Schema de actualización de usuario.
 * Todos los campos son opcionales.
 */
export const usuarioUpdateSchema = z
  .object({
    nombre: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    contrasena: z.string().min(10).max(200).optional(),
    rol: z.enum(["ADMIN", "SUPERVISOR", "GERENTE"]).optional(),
    activo: z.boolean().optional(),
  })
  .strict();

/**
 * Tipo seguro para exponer al cliente.
 * Excluye: contrasena y tokenVersion.
 */
export type UsuarioPublic = Omit<Usuario, "contrasena" | "tokenVersion">;

/**
 * Convierte un Usuario de BD a una vista pública segura.
 */
export function toUsuarioPublic(usuario: Usuario): UsuarioPublic {
  const { contrasena, tokenVersion, ...rest } = usuario;
  return rest;
}

/**
 * Convierte un payload válido en datos listos para Prisma.
 * Hashea la contraseña antes de persistir.
 */
export async function toUsuarioCreateData(
  input: z.infer<typeof usuarioCreateSchema>,
): Promise<Prisma.UsuarioCreateInput> {
  const data = usuarioCreateSchema.parse(input);
  const hashed = await hashPassword(data.contrasena);
  return { ...data, contrasena: hashed };
}

/**
 * Convierte un payload de actualización en datos listos para Prisma.
 * Si se incluye contrasena, se hashea.
 */
export async function toUsuarioUpdateData(
  input: z.infer<typeof usuarioUpdateSchema>,
): Promise<Prisma.UsuarioUpdateInput> {
  const data = usuarioUpdateSchema.parse(input);
  if (data.contrasena) {
    data.contrasena = await hashPassword(data.contrasena);
  }
  return data;
}
