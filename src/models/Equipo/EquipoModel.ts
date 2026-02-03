import { z } from "zod";
import { type Prisma, type Equipo, EstadoEquipo, TipoEquipo } from "@prisma/client";

export const equipoCreateSchema = z.object({
  codigoInventario: z.string().min(1).max(100).optional(),
  serie: z.string().min(1).max(100).optional(),
  tipo: z.nativeEnum(TipoEquipo),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),
  descripcion: z.string().max(2000).optional(),
  estado: z.nativeEnum(EstadoEquipo).optional(),
  fechaCompra: z.coerce.date().optional(),
  costo: z.coerce.number().nonnegative().optional(),
  localidadId: z.number().int().positive().optional(),
});

export const equipoUpdateSchema = z
  .object({
    codigoInventario: z.string().min(1).max(100).optional(),
    serie: z.string().min(1).max(100).optional(),
    tipo: z.nativeEnum(TipoEquipo).optional(),
    marca: z.string().max(100).optional(),
    modelo: z.string().max(100).optional(),
    descripcion: z.string().max(2000).optional(),
    estado: z.nativeEnum(EstadoEquipo).optional(),
    fechaCompra: z.coerce.date().optional().nullable(),
    costo: z.coerce.number().nonnegative().optional().nullable(),
    localidadId: z.number().int().positive().optional().nullable(),
  })
  .strict();

export type EquipoPublic = Equipo;

export function toEquipoPublic(row: Equipo): EquipoPublic {
  return row;
}

export function toEquipoCreateData(
  input: z.infer<typeof equipoCreateSchema>,
): Prisma.EquipoCreateInput {
  const data = equipoCreateSchema.parse(input);
  return {
    codigoInventario: data.codigoInventario,
    serie: data.serie,
    tipo: data.tipo,
    marca: data.marca,
    modelo: data.modelo,
    descripcion: data.descripcion,
    estado: data.estado ?? EstadoEquipo.DISPONIBLE,
    fechaCompra: data.fechaCompra,
    costo: data.costo,
    ...(data.localidadId ? { localidad: { connect: { id: data.localidadId } } } : {}),
  };
}

export function toEquipoUpdateData(
  input: z.infer<typeof equipoUpdateSchema>,
): Prisma.EquipoUpdateInput {
  const data = equipoUpdateSchema.parse(input);
  const update: Prisma.EquipoUpdateInput = {
    codigoInventario: data.codigoInventario,
    serie: data.serie,
    tipo: data.tipo,
    marca: data.marca,
    modelo: data.modelo,
    descripcion: data.descripcion,
    estado: data.estado,
    fechaCompra: data.fechaCompra === undefined ? undefined : data.fechaCompra,
    costo: data.costo === undefined ? undefined : data.costo,
  };

  if (data.localidadId !== undefined) {
    update.localidad =
      data.localidadId === null
        ? { disconnect: true }
        : { connect: { id: data.localidadId } };
  }

  return update;
}
