import { z } from "zod";
import { type Prisma, type Empleado } from "@prisma/client";

export const empleadoCreateSchema = z.object({
  nombre: z.string().min(2).max(150),
  email: z.string().email().optional(),
  numeroEmpleado: z.string().min(1).max(50).optional(),
  puestoId: z.number().int().positive().optional(),
  areaId: z.number().int().positive().optional(),
  telefono: z.string().min(5).max(30).optional(),
  localidadId: z.number().int().positive().optional(),
  usuarioId: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
});

export const empleadoUpdateSchema = z
  .object({
    nombre: z.string().min(2).max(150).optional(),
    email: z.string().email().optional(),
    numeroEmpleado: z.string().min(1).max(50).optional(),
    puestoId: z.number().int().positive().optional().nullable(),
    areaId: z.number().int().positive().optional().nullable(),
    telefono: z.string().min(5).max(30).optional(),
    localidadId: z.number().int().positive().optional().nullable(),
    usuarioId: z.number().int().positive().optional().nullable(),
    activo: z.boolean().optional(),
  })
  .strict();

export type EmpleadoPublic = Empleado;

export function toEmpleadoPublic(empleado: Empleado): EmpleadoPublic {
  return empleado;
}

export function toEmpleadoCreateData(
  input: z.infer<typeof empleadoCreateSchema>,
): Prisma.EmpleadoCreateInput {
  const data = empleadoCreateSchema.parse(input);
  return {
    nombre: data.nombre,
    email: data.email,
    numeroEmpleado: data.numeroEmpleado,
    telefono: data.telefono,
    activo: data.activo ?? true,
    ...(data.localidadId ? { localidad: { connect: { id: data.localidadId } } } : {}),
    ...(data.usuarioId ? { usuario: { connect: { id: data.usuarioId } } } : {}),
    ...(data.areaId ? { area: { connect: { id: data.areaId } } } : {}),
    ...(data.puestoId ? { puesto: { connect: { id: data.puestoId } } } : {}),
  };
}

export function toEmpleadoUpdateData(
  input: z.infer<typeof empleadoUpdateSchema>,
): Prisma.EmpleadoUpdateInput {
  const data = empleadoUpdateSchema.parse(input);
  const update: Prisma.EmpleadoUpdateInput = {
    nombre: data.nombre,
    email: data.email,
    numeroEmpleado: data.numeroEmpleado,
    telefono: data.telefono,
    activo: data.activo,
  };

  if (data.localidadId !== undefined) {
    update.localidad = data.localidadId
      ? { connect: { id: data.localidadId } }
      : { disconnect: true };
  }
  if (data.usuarioId !== undefined) {
    update.usuario = data.usuarioId ? { connect: { id: data.usuarioId } } : { disconnect: true };
  }
  if (data.areaId !== undefined) {
    update.area = data.areaId ? { connect: { id: data.areaId } } : { disconnect: true };
  }
  if (data.puestoId !== undefined) {
    update.puesto = data.puestoId ? { connect: { id: data.puestoId } } : { disconnect: true };
  }

  return update;
}
