import { documentoCreateSchema, documentoUpdateSchema } from "../src/models/Documento/DocumentoModel";

describe("DocumentoModel", () => {
  it("requiere asociar a entidad", () => {
    const result = documentoCreateSchema.safeParse({
      tipo: "RESGUARDO",
      ruta: "/tmp/doc.pdf",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = documentoUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
