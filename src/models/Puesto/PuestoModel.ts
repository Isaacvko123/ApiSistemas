import { z } from "zod";
import { type Prisma, type Puesto } from "@prisma/client";

export const puestoCreateSchema = z.object({
  nombre: z.string().min(2).max(150),
  areaId: z.number().int().positive(),
});

export const puestoUpdateSchema = z
  .object({
    nombre: z.string().min(2).max(150).optional(),
    areaId: z.number().int().positive().optional(),
  })
  .strict();

export type PuestoPublic = Puesto;

export function toPuestoPublic(puesto: Puesto): PuestoPublic {
  return puesto;
}

export function toPuestoCreateData(
  input: z.infer<typeof puestoCreateSchema>,
): Prisma.PuestoCreateInput {
  const data = puestoCreateSchema.parse(input);
  return {
    nombre: data.nombre,
    area: { connect: { id: data.areaId } },
  };
}

export function toPuestoUpdateData(
  input: z.infer<typeof puestoUpdateSchema>,
): Prisma.PuestoUpdateInput {
  const data = puestoUpdateSchema.parse(input);
  const update: Prisma.PuestoUpdateInput = {
    nombre: data.nombre,
  };

  if (data.areaId !== undefined) {
    update.area = { connect: { id: data.areaId } };
  }

  return update;
}
