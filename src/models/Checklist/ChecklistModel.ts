import { z } from "zod";
import { type Prisma, type Checklist } from "@prisma/client";

export const checklistCreateSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(2000).optional(),
  puestoId: z.number().int().positive(),
});

export const checklistUpdateSchema = z
  .object({
    nombre: z.string().min(2).max(200).optional(),
    descripcion: z.string().max(2000).optional(),
    puestoId: z.number().int().positive().optional(),
  })
  .strict();

export type ChecklistPublic = Checklist;

export function toChecklistPublic(checklist: Checklist): ChecklistPublic {
  return checklist;
}

export function toChecklistCreateData(
  input: z.infer<typeof checklistCreateSchema>,
): Prisma.ChecklistCreateInput {
  const data = checklistCreateSchema.parse(input);
  return {
    nombre: data.nombre,
    descripcion: data.descripcion,
    puesto: { connect: { id: data.puestoId } },
  };
}

export function toChecklistUpdateData(
  input: z.infer<typeof checklistUpdateSchema>,
): Prisma.ChecklistUpdateInput {
  const data = checklistUpdateSchema.parse(input);
  const update: Prisma.ChecklistUpdateInput = {
    nombre: data.nombre,
    descripcion: data.descripcion,
  };

  if (data.puestoId !== undefined) {
    update.puesto = { connect: { id: data.puestoId } };
  }

  return update;
}
