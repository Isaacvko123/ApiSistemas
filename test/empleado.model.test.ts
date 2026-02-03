import {
  empleadoCreateSchema,
  empleadoUpdateSchema,
} from "../src/models/Empleado/EmpleadoModel";

describe("EmpleadoModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = empleadoCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = empleadoUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
