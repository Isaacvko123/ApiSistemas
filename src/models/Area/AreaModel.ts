import { z } from "zod";
import { type Area } from "@prisma/client";

export const areaCreateSchema = z.object({
  nombre: z.string().min(2).max(150),
});

export const areaUpdateSchema = z
  .object({
    nombre: z.string().min(2).max(150).optional(),
  })
  .strict();

export type AreaPublic = Area;

export function toAreaPublic(area: Area): AreaPublic {
  return area;
}
