import {
  checklistItemCreateSchema,
  checklistItemUpdateSchema,
} from "../src/models/ChecklistItem/ChecklistItemModel";

describe("ChecklistItemModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = checklistItemCreateSchema.safeParse({ descripcion: "Item" });
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = checklistItemUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
