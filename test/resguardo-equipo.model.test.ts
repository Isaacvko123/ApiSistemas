import {
  resguardoEquipoCreateSchema,
  resguardoEquipoUpdateSchema,
} from "../src/models/ResguardoEquipo/ResguardoEquipoModel";

describe("ResguardoEquipoModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = resguardoEquipoCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = resguardoEquipoUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
