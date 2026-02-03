import { z } from "zod";
import { type Localidad } from "@prisma/client";

export const localidadCreateSchema = z.object({
  codigo: z.string().min(1).max(50).optional(),
  nombre: z.string().min(2).max(150),
  estado: z.string().min(2).max(100),
  ciudad: z.string().min(2).max(120).optional(),
  direccion: z.string().min(2).max(250).optional(),
  cp: z.string().min(3).max(20).optional(),
  notas: z.string().max(2000).optional(),
});

export const localidadUpdateSchema = z
  .object({
    codigo: z.string().min(1).max(50).optional(),
    nombre: z.string().min(2).max(150).optional(),
    estado: z.string().min(2).max(100).optional(),
    ciudad: z.string().min(2).max(120).optional(),
    direccion: z.string().min(2).max(250).optional(),
    cp: z.string().min(3).max(20).optional(),
    notas: z.string().max(2000).optional(),
  })
  .strict();

export type LocalidadPublic = Localidad;

export function toLocalidadPublic(localidad: Localidad): LocalidadPublic {
  return localidad;
}
