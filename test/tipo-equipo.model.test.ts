import {
  tipoEquipoCreateSchema,
  tipoEquipoUpdateSchema,
} from "../src/models/TipoEquipo/TipoEquipoModel";

describe("TipoEquipoModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = tipoEquipoCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = tipoEquipoUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
