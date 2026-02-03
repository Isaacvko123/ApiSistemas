import { z } from "zod";
import { type Prisma, type ResguardoEquipo } from "@prisma/client";

export const resguardoEquipoCreateSchema = z.object({
  resguardoId: z.number().int().positive(),
  equipoId: z.number().int().positive(),
  fechaEntrega: z.coerce.date(),
  fechaDevolucion: z.coerce.date().optional(),
  observaciones: z.string().max(2000).optional(),
  entregadoPorId: z.number().int().positive().optional(),
  recibidoPorId: z.number().int().positive().optional(),
});

export const resguardoEquipoUpdateSchema = z
  .object({
    fechaEntrega: z.coerce.date().optional(),
    fechaDevolucion: z.coerce.date().optional().nullable(),
    observaciones: z.string().max(2000).optional(),
    entregadoPorId: z.number().int().positive().optional().nullable(),
    recibidoPorId: z.number().int().positive().optional().nullable(),
  })
  .strict();

export type ResguardoEquipoPublic = ResguardoEquipo;

export function toResguardoEquipoPublic(
  resguardoEquipo: ResguardoEquipo,
): ResguardoEquipoPublic {
  return resguardoEquipo;
}

export function toResguardoEquipoCreateData(
  input: z.infer<typeof resguardoEquipoCreateSchema>,
): Prisma.ResguardoEquipoCreateInput {
  const data = resguardoEquipoCreateSchema.parse(input);
  return {
    fechaEntrega: data.fechaEntrega,
    fechaDevolucion: data.fechaDevolucion,
    observaciones: data.observaciones,
    resguardo: { connect: { id: data.resguardoId } },
    equipo: { connect: { id: data.equipoId } },
    ...(data.entregadoPorId ? { entregadoPor: { connect: { id: data.entregadoPorId } } } : {}),
    ...(data.recibidoPorId ? { recibidoPor: { connect: { id: data.recibidoPorId } } } : {}),
  };
}

export function toResguardoEquipoUpdateData(
  input: z.infer<typeof resguardoEquipoUpdateSchema>,
): Prisma.ResguardoEquipoUpdateInput {
  const data = resguardoEquipoUpdateSchema.parse(input);
  const update: Prisma.ResguardoEquipoUpdateInput = {
    fechaEntrega: data.fechaEntrega,
    fechaDevolucion: data.fechaDevolucion === null ? null : data.fechaDevolucion,
    observaciones: data.observaciones,
  };

  if (data.entregadoPorId !== undefined) {
    update.entregadoPor =
      data.entregadoPorId === null
        ? { disconnect: true }
        : { connect: { id: data.entregadoPorId } };
  }
  if (data.recibidoPorId !== undefined) {
    update.recibidoPor =
      data.recibidoPorId === null
        ? { disconnect: true }
        : { connect: { id: data.recibidoPorId } };
  }

  return update;
}
