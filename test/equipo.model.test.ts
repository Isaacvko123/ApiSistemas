import {
  equipoCreateSchema,
  equipoUpdateSchema,
} from "../src/models/Equipo/EquipoModel";

describe("EquipoModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = equipoCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = equipoUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
