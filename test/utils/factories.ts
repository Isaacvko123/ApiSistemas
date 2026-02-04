import { prisma } from "../../src/db/prisma";

export async function createArea(overrides?: { nombre?: string }) {
  return prisma.area.create({
    data: {
      nombre: overrides?.nombre ?? `Area-${Date.now()}`,
    },
  });
}

export async function createPuesto(overrides?: { nombre?: string; areaId?: number }) {
  const areaId = overrides?.areaId ?? (await createArea()).id;
  return prisma.puesto.create({
    data: {
      nombre: overrides?.nombre ?? `Puesto-${Date.now()}`,
      area: { connect: { id: areaId } },
    },
  });
}

export async function createLocalidad(overrides?: { nombre?: string; estado?: string }) {
  return prisma.localidad.create({
    data: {
      nombre: overrides?.nombre ?? `Localidad-${Date.now()}`,
      estado: overrides?.estado ?? "Jalisco",
    },
  });
}

export async function createEmpleado(overrides?: {
  nombre?: string;
  areaId?: number;
  puestoId?: number;
  localidadId?: number;
}) {
  const data: any = {
    nombre: overrides?.nombre ?? `Empleado-${Date.now()}`,
  };

  if (overrides?.areaId) data.area = { connect: { id: overrides.areaId } };
  if (overrides?.puestoId) data.puesto = { connect: { id: overrides.puestoId } };
  if (overrides?.localidadId) data.localidad = { connect: { id: overrides.localidadId } };

  return prisma.empleado.create({ data });
}

export async function createTipoEquipo(overrides?: { nombre?: string }) {
  return prisma.tipoEquipo.create({
    data: {
      nombre: overrides?.nombre ?? `Tipo-${Date.now()}`,
    },
  });
}

export async function createEquipo(overrides?: { tipoEquipoId?: number }) {
  const tipoEquipoId = overrides?.tipoEquipoId ?? (await createTipoEquipo()).id;
  return prisma.equipo.create({
    data: {
      tipoEquipo: { connect: { id: tipoEquipoId } },
    },
  });
}

export async function createResguardo(overrides?: {
  empleadoId?: number;
  localidadId?: number;
}) {
  const empleadoId = overrides?.empleadoId ?? (await createEmpleado()).id;
  const data: any = {
    empleado: { connect: { id: empleadoId } },
    fechaInicio: new Date(),
  };

  if (overrides?.localidadId) {
    data.localidad = { connect: { id: overrides.localidadId } };
  }

  return prisma.resguardo.create({ data });
}

export async function createResguardoEquipo(overrides?: {
  resguardoId?: number;
  equipoId?: number;
}) {
  const resguardoId = overrides?.resguardoId ?? (await createResguardo()).id;
  const equipoId = overrides?.equipoId ?? (await createEquipo()).id;

  return prisma.resguardoEquipo.create({
    data: {
      resguardo: { connect: { id: resguardoId } },
      equipo: { connect: { id: equipoId } },
      fechaEntrega: new Date(),
    },
  });
}

export async function createChecklist(overrides?: { puestoId?: number; nombre?: string }) {
  const puestoId = overrides?.puestoId ?? (await createPuesto()).id;
  return prisma.checklist.create({
    data: {
      nombre: overrides?.nombre ?? `Checklist-${Date.now()}`,
      puesto: { connect: { id: puestoId } },
    },
  });
}

export async function createChecklistItem(overrides?: {
  checklistId?: number;
  descripcion?: string;
}) {
  const checklistId = overrides?.checklistId ?? (await createChecklist()).id;
  return prisma.checklistItem.create({
    data: {
      descripcion: overrides?.descripcion ?? "Item",
      checklist: { connect: { id: checklistId } },
    },
  });
}
