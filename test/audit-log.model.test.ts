import { auditLogFilterSchema } from "../src/models/AuditLog/AuditLogModel";

describe("AuditLogModel", () => {
  it("rechaza filtros invalidos", () => {
    const result = auditLogFilterSchema.safeParse({ actorId: "no" });
    expect(result.success).toBe(false);
  });
});
