import { z } from "zod";
import { type Prisma, type WifiCredencial } from "@prisma/client";
import { decryptSecret, encryptSecret } from "../../seguridad/encryption";

export const wifiCredencialCreateSchema = z.object({
  ssid: z.string().min(1).max(200),
  usuario: z.string().min(1).max(200),
  password: z.string().min(1),
  notas: z.string().max(2000).optional(),
  vigente: z.boolean().optional(),
  empleadoId: z.number().int().positive().optional(),
  localidadId: z.number().int().positive().optional(),
});

export const wifiCredencialUpdateSchema = z
  .object({
    ssid: z.string().min(1).max(200).optional(),
    usuario: z.string().min(1).max(200).optional(),
    password: z.string().min(1).optional(),
    notas: z.string().max(2000).optional(),
    vigente: z.boolean().optional(),
    empleadoId: z.number().int().positive().optional().nullable(),
    localidadId: z.number().int().positive().optional().nullable(),
  })
  .strict();

export type WifiCredencialPublic = Omit<
  WifiCredencial,
  "passwordEnc" | "passwordIv" | "passwordTag" | "passwordKeyVersion"
> & { password?: string };

export function toWifiCredencialPublic(
  row: WifiCredencial,
  includePassword = false,
): WifiCredencialPublic {
  const { passwordEnc, passwordIv, passwordTag, passwordKeyVersion, ...rest } = row;
  if (!includePassword) return rest;

  const password = decryptSecret({
    ciphertext: passwordEnc,
    iv: passwordIv,
    tag: passwordTag ?? "",
    keyVersion: passwordKeyVersion as 1 | 2,
  });

  return { ...rest, password };
}

export function toWifiCredencialCreateData(
  input: z.infer<typeof wifiCredencialCreateSchema>,
): Prisma.WifiCredencialCreateInput {
  const data = wifiCredencialCreateSchema.parse(input);
  const encrypted = encryptSecret(data.password);
  return {
    ssid: data.ssid,
    usuario: data.usuario,
    passwordEnc: encrypted.ciphertext,
    passwordIv: encrypted.iv,
    passwordTag: encrypted.tag,
    passwordKeyVersion: encrypted.keyVersion,
    notas: data.notas,
    vigente: data.vigente ?? true,
    ...(data.empleadoId ? { empleado: { connect: { id: data.empleadoId } } } : {}),
    ...(data.localidadId ? { localidad: { connect: { id: data.localidadId } } } : {}),
  };
}

export function toWifiCredencialUpdateData(
  input: z.infer<typeof wifiCredencialUpdateSchema>,
): Prisma.WifiCredencialUpdateInput {
  const data = wifiCredencialUpdateSchema.parse(input);
  const update: Prisma.WifiCredencialUpdateInput = {
    ssid: data.ssid,
    usuario: data.usuario,
    notas: data.notas,
    vigente: data.vigente,
  };

  if (data.password) {
    const encrypted = encryptSecret(data.password);
    update.passwordEnc = encrypted.ciphertext;
    update.passwordIv = encrypted.iv;
    update.passwordTag = encrypted.tag;
    update.passwordKeyVersion = encrypted.keyVersion;
  }

  if (data.empleadoId !== undefined) {
    update.empleado =
      data.empleadoId === null
        ? { disconnect: true }
        : { connect: { id: data.empleadoId } };
  }
  if (data.localidadId !== undefined) {
    update.localidad =
      data.localidadId === null
        ? { disconnect: true }
        : { connect: { id: data.localidadId } };
  }

  return update;
}
