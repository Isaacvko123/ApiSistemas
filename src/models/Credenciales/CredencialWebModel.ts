import { z } from "zod";
import { type Prisma, type CredencialWeb } from "@prisma/client";
import {
  CURRENT_KEY_VERSION,
  decryptSecret,
  encryptSecret,
  rotateEncrypted,
} from "../../seguridad/encryption";

export const credencialWebCreateSchema = z.object({
  nombre: z.string().min(2).max(200),
  url: z.string().url(),
  usuario: z.string().min(1).max(200),
  password: z.string().min(1),
  notas: z.string().max(2000).optional(),
  activo: z.boolean().optional(),
  empleadoId: z.number().int().positive().optional(),
  areaId: z.number().int().positive().optional(),
  puestoId: z.number().int().positive().optional(),
});

export const credencialWebUpdateSchema = z
  .object({
    nombre: z.string().min(2).max(200).optional(),
    url: z.string().url().optional(),
    usuario: z.string().min(1).max(200).optional(),
    password: z.string().min(1).optional(),
    notas: z.string().max(2000).optional(),
    activo: z.boolean().optional(),
    empleadoId: z.number().int().positive().optional().nullable(),
    areaId: z.number().int().positive().optional().nullable(),
    puestoId: z.number().int().positive().optional().nullable(),
  })
  .strict();

export type CredencialWebPublic = Omit<
  CredencialWeb,
  "passwordEnc" | "passwordIv" | "passwordTag" | "passwordKeyVersion"
> & { password?: string };

export function toCredencialWebPublic(
  row: CredencialWeb,
  includePassword = false,
): CredencialWebPublic {
  const {
    passwordEnc,
    passwordIv,
    passwordTag,
    passwordKeyVersion,
    ...rest
  } = row;

  if (!includePassword) return rest;

  const password = decryptSecret({
    ciphertext: passwordEnc,
    iv: passwordIv,
    tag: passwordTag ?? "",
    keyVersion: passwordKeyVersion as 1 | 2,
  });

  return { ...rest, password };
}

export function rotateCredencialIfNeeded(
  row: CredencialWeb,
): Prisma.CredencialWebUpdateInput | null {
  if ((row.passwordKeyVersion as 1 | 2) === CURRENT_KEY_VERSION) return null;
  if (!row.passwordTag) return null;

  const rotated = rotateEncrypted({
    ciphertext: row.passwordEnc,
    iv: row.passwordIv,
    tag: row.passwordTag,
    keyVersion: row.passwordKeyVersion as 1 | 2,
  });

  return {
    passwordEnc: rotated.ciphertext,
    passwordIv: rotated.iv,
    passwordTag: rotated.tag,
    passwordKeyVersion: rotated.keyVersion,
  };
}

export function toCredencialWebCreateData(
  input: z.infer<typeof credencialWebCreateSchema>,
): Prisma.CredencialWebCreateInput {
  const data = credencialWebCreateSchema.parse(input);
  const encrypted = encryptSecret(data.password);

  return {
    nombre: data.nombre,
    url: data.url,
    usuario: data.usuario,
    passwordEnc: encrypted.ciphertext,
    passwordIv: encrypted.iv,
    passwordTag: encrypted.tag,
    passwordKeyVersion: encrypted.keyVersion,
    notas: data.notas,
    activo: data.activo ?? true,
    ...(data.empleadoId ? { empleado: { connect: { id: data.empleadoId } } } : {}),
    ...(data.areaId ? { area: { connect: { id: data.areaId } } } : {}),
    ...(data.puestoId ? { puesto: { connect: { id: data.puestoId } } } : {}),
  };
}

export function toCredencialWebUpdateData(
  input: z.infer<typeof credencialWebUpdateSchema>,
): Prisma.CredencialWebUpdateInput {
  const data = credencialWebUpdateSchema.parse(input);
  const update: Prisma.CredencialWebUpdateInput = {
    nombre: data.nombre,
    url: data.url,
    usuario: data.usuario,
    notas: data.notas,
    activo: data.activo,
  };

  if (data.password) {
    const encrypted = encryptSecret(data.password);
    update.passwordEnc = encrypted.ciphertext;
    update.passwordIv = encrypted.iv;
    update.passwordTag = encrypted.tag;
    update.passwordKeyVersion = encrypted.keyVersion;
  }

  if (data.empleadoId !== undefined) {
    update.empleado = data.empleadoId
      ? { connect: { id: data.empleadoId } }
      : { disconnect: true };
  }
  if (data.areaId !== undefined) {
    update.area = data.areaId ? { connect: { id: data.areaId } } : { disconnect: true };
  }
  if (data.puestoId !== undefined) {
    update.puesto = data.puestoId ? { connect: { id: data.puestoId } } : { disconnect: true };
  }

  return update;
}
