import { z } from "zod";
import { type Prisma, type Resguardo, EstadoResguardo } from "@prisma/client";

export const resguardoCreateSchema = z.object({
  empleadoId: z.number().int().positive(),
  localidadId: z.number().int().positive().optional(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date().optional(),
  estado: z.nativeEnum(EstadoResguardo).optional(),
  observaciones: z.string().max(2000).optional(),
  folio: z.string().max(100).optional(),
  creadoPorId: z.number().int().positive().optional(),
});

export const resguardoUpdateSchema = z
  .object({
    empleadoId: z.number().int().positive().optional(),
    localidadId: z.number().int().positive().optional().nullable(),
    fechaInicio: z.coerce.date().optional(),
    fechaFin: z.coerce.date().optional().nullable(),
    estado: z.nativeEnum(EstadoResguardo).optional(),
    observaciones: z.string().max(2000).optional(),
    folio: z.string().max(100).optional(),
  })
  .strict();

export type ResguardoPublic = Resguardo;

export function toResguardoPublic(resguardo: Resguardo): ResguardoPublic {
  return resguardo;
}

export function toResguardoCreateData(
  input: z.infer<typeof resguardoCreateSchema>,
): Prisma.ResguardoCreateInput {
  const data = resguardoCreateSchema.parse(input);
  return {
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    estado: data.estado,
    observaciones: data.observaciones,
    folio: data.folio,
    empleado: { connect: { id: data.empleadoId } },
    ...(data.localidadId ? { localidad: { connect: { id: data.localidadId } } } : {}),
    ...(data.creadoPorId ? { creadoPor: { connect: { id: data.creadoPorId } } } : {}),
  };
}

export function toResguardoUpdateData(
  input: z.infer<typeof resguardoUpdateSchema>,
): Prisma.ResguardoUpdateInput {
  const data = resguardoUpdateSchema.parse(input);
  const update: Prisma.ResguardoUpdateInput = {
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin === null ? null : data.fechaFin,
    estado: data.estado,
    observaciones: data.observaciones,
    folio: data.folio,
  };

  if (data.empleadoId !== undefined) {
    update.empleado = { connect: { id: data.empleadoId } };
  }
  if (data.localidadId !== undefined) {
    update.localidad =
      data.localidadId === null
        ? { disconnect: true }
        : { connect: { id: data.localidadId } };
  }

  return update;
}
