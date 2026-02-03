import { puestoCreateSchema, puestoUpdateSchema } from "../src/models/Puesto/PuestoModel";

describe("PuestoModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = puestoCreateSchema.safeParse({ nombre: "Soporte" });
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = puestoUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
