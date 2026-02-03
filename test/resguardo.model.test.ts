import {
  resguardoCreateSchema,
  resguardoUpdateSchema,
} from "../src/models/Resguardo/ResguardoModel";

describe("ResguardoModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = resguardoCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = resguardoUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
