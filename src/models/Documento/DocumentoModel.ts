import { z } from "zod";
import { type Prisma, type Documento, TipoDocumento, DocumentoEvento } from "@prisma/client";

const baseCreate = z.object({
  tipo: z.nativeEnum(TipoDocumento),
  evento: z.nativeEnum(DocumentoEvento).optional(),
  ruta: z.string().min(1),
  nombreArchivo: z.string().max(255).optional(),
  mime: z.string().max(150).optional(),
  sizeBytes: z.number().int().positive().optional(),
  checksum: z.string().max(200).optional(),
  equipoId: z.number().int().positive().optional(),
  resguardoId: z.number().int().positive().optional(),
  resguardoEquipoId: z.number().int().positive().optional(),
  empleadoId: z.number().int().positive().optional(),
  subidoPorId: z.number().int().positive().optional(),
});

export const documentoCreateSchema = baseCreate.superRefine((data, ctx) => {
  if (!data.equipoId && !data.resguardoId && !data.resguardoEquipoId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe asociarse a equipo, resguardo o resguardoEquipo",
      path: ["equipoId"],
    });
  }
});

export const documentoUpdateSchema = z
  .object({
    tipo: z.nativeEnum(TipoDocumento).optional(),
    evento: z.nativeEnum(DocumentoEvento).optional().nullable(),
    ruta: z.string().min(1).optional(),
    nombreArchivo: z.string().max(255).optional(),
    mime: z.string().max(150).optional(),
    sizeBytes: z.number().int().positive().optional().nullable(),
    checksum: z.string().max(200).optional().nullable(),
    equipoId: z.number().int().positive().optional().nullable(),
    resguardoId: z.number().int().positive().optional().nullable(),
    resguardoEquipoId: z.number().int().positive().optional().nullable(),
    empleadoId: z.number().int().positive().optional().nullable(),
    subidoPorId: z.number().int().positive().optional().nullable(),
  })
  .strict();

export type DocumentoPublic = Documento;

export function toDocumentoPublic(doc: Documento): DocumentoPublic {
  return doc;
}

export function toDocumentoCreateData(
  input: z.infer<typeof documentoCreateSchema>,
): Prisma.DocumentoCreateInput {
  const data = documentoCreateSchema.parse(input);
  return {
    tipo: data.tipo,
    evento: data.evento,
    ruta: data.ruta,
    nombreArchivo: data.nombreArchivo,
    mime: data.mime,
    sizeBytes: data.sizeBytes,
    checksum: data.checksum,
    ...(data.equipoId ? { equipo: { connect: { id: data.equipoId } } } : {}),
    ...(data.resguardoId ? { resguardo: { connect: { id: data.resguardoId } } } : {}),
    ...(data.resguardoEquipoId
      ? { resguardoEquipo: { connect: { id: data.resguardoEquipoId } } }
      : {}),
    ...(data.empleadoId ? { empleado: { connect: { id: data.empleadoId } } } : {}),
    ...(data.subidoPorId ? { subidoPor: { connect: { id: data.subidoPorId } } } : {}),
  };
}

export function toDocumentoUpdateData(
  input: z.infer<typeof documentoUpdateSchema>,
): Prisma.DocumentoUpdateInput {
  const data = documentoUpdateSchema.parse(input);
  const update: Prisma.DocumentoUpdateInput = {
    tipo: data.tipo,
    evento: data.evento === null ? null : data.evento,
    ruta: data.ruta,
    nombreArchivo: data.nombreArchivo,
    mime: data.mime,
    sizeBytes: data.sizeBytes === undefined ? undefined : data.sizeBytes,
    checksum: data.checksum === undefined ? undefined : data.checksum,
  };

  if (data.equipoId !== undefined) {
    update.equipo =
      data.equipoId === null ? { disconnect: true } : { connect: { id: data.equipoId } };
  }
  if (data.resguardoId !== undefined) {
    update.resguardo =
      data.resguardoId === null
        ? { disconnect: true }
        : { connect: { id: data.resguardoId } };
  }
  if (data.resguardoEquipoId !== undefined) {
    update.resguardoEquipo =
      data.resguardoEquipoId === null
        ? { disconnect: true }
        : { connect: { id: data.resguardoEquipoId } };
  }
  if (data.empleadoId !== undefined) {
    update.empleado =
      data.empleadoId === null
        ? { disconnect: true }
        : { connect: { id: data.empleadoId } };
  }
  if (data.subidoPorId !== undefined) {
    update.subidoPor =
      data.subidoPorId === null
        ? { disconnect: true }
        : { connect: { id: data.subidoPorId } };
  }

  return update;
}
