import { z } from "zod";
import { type Prisma, type ChecklistItem } from "@prisma/client";

export const checklistItemCreateSchema = z.object({
  checklistId: z.number().int().positive(),
  descripcion: z.string().min(2).max(300),
  tipoEquipoId: z.number().int().positive().optional(),
  cantidad: z.number().int().positive().optional(),
  obligatorio: z.boolean().optional(),
});

export const checklistItemUpdateSchema = z
  .object({
    descripcion: z.string().min(2).max(300).optional(),
    tipoEquipoId: z.number().int().positive().optional().nullable(),
    cantidad: z.number().int().positive().optional(),
    obligatorio: z.boolean().optional(),
    checklistId: z.number().int().positive().optional(),
  })
  .strict();

export type ChecklistItemPublic = ChecklistItem;

export function toChecklistItemPublic(item: ChecklistItem): ChecklistItemPublic {
  return item;
}

export function toChecklistItemCreateData(
  input: z.infer<typeof checklistItemCreateSchema>,
): Prisma.ChecklistItemCreateInput {
  const data = checklistItemCreateSchema.parse(input);
  return {
    descripcion: data.descripcion,
    cantidad: data.cantidad ?? 1,
    obligatorio: data.obligatorio ?? true,
    checklist: { connect: { id: data.checklistId } },
    ...(data.tipoEquipoId ? { tipoEquipo: { connect: { id: data.tipoEquipoId } } } : {}),
  };
}

export function toChecklistItemUpdateData(
  input: z.infer<typeof checklistItemUpdateSchema>,
): Prisma.ChecklistItemUpdateInput {
  const data = checklistItemUpdateSchema.parse(input);
  const update: Prisma.ChecklistItemUpdateInput = {
    descripcion: data.descripcion,
    cantidad: data.cantidad,
    obligatorio: data.obligatorio,
  };

  if (data.tipoEquipoId !== undefined) {
    update.tipoEquipo =
      data.tipoEquipoId === null
        ? { disconnect: true }
        : { connect: { id: data.tipoEquipoId } };
  }

  if (data.checklistId !== undefined) {
    update.checklist = { connect: { id: data.checklistId } };
  }

  return update;
}
