import {
  localidadCreateSchema,
  localidadUpdateSchema,
} from "../src/models/Localidad/LocalidadModel";

describe("LocalidadModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = localidadCreateSchema.safeParse({ nombre: "X" });
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = localidadUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
