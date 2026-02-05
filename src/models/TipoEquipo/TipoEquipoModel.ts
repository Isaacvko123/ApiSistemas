import { z } from "zod";
import { type TipoEquipo } from "@prisma/client";

export const tipoEquipoCreateSchema = z.object({
  nombre: z.string().min(2).max(150),
  descripcion: z.string().min(2).max(500).optional(),
  activo: z.boolean().optional(),
});

export const tipoEquipoUpdateSchema = z
  .object({
    nombre: z.string().min(2).max(150).optional(),
    descripcion: z.string().min(2).max(500).optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export type TipoEquipoPublic = TipoEquipo;

export function toTipoEquipoPublic(tipo: TipoEquipo): TipoEquipoPublic {
  return tipo;
}
