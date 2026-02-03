import { z } from "zod";
import { type Prisma, type WifiCredencial } from "@prisma/client";

export const wifiCredencialCreateSchema = z.object({
  ssid: z.string().min(1).max(200),
  usuario: z.string().min(1).max(200),
  passwordEnc: z.string().min(1),
  notas: z.string().max(2000).optional(),
  vigente: z.boolean().optional(),
  empleadoId: z.number().int().positive().optional(),
  localidadId: z.number().int().positive().optional(),
});

export const wifiCredencialUpdateSchema = z
  .object({
    ssid: z.string().min(1).max(200).optional(),
    usuario: z.string().min(1).max(200).optional(),
    passwordEnc: z.string().min(1).optional(),
    notas: z.string().max(2000).optional(),
    vigente: z.boolean().optional(),
    empleadoId: z.number().int().positive().optional().nullable(),
    localidadId: z.number().int().positive().optional().nullable(),
  })
  .strict();

export type WifiCredencialPublic = WifiCredencial;

export function toWifiCredencialPublic(row: WifiCredencial): WifiCredencialPublic {
  return row;
}

export function toWifiCredencialCreateData(
  input: z.infer<typeof wifiCredencialCreateSchema>,
): Prisma.WifiCredencialCreateInput {
  const data = wifiCredencialCreateSchema.parse(input);
  return {
    ssid: data.ssid,
    usuario: data.usuario,
    passwordEnc: data.passwordEnc,
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
    passwordEnc: data.passwordEnc,
    notas: data.notas,
    vigente: data.vigente,
  };

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
