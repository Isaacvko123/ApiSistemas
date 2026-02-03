import { checklistCreateSchema, checklistUpdateSchema } from "../src/models/Checklist/ChecklistModel";

describe("ChecklistModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = checklistCreateSchema.safeParse({ nombre: "Checklist" });
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = checklistUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
