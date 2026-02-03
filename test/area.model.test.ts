import { areaCreateSchema, areaUpdateSchema } from "../src/models/Area/AreaModel";

describe("AreaModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = areaCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = areaUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
