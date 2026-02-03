import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";
import { createChecklist } from "./utils/factories";

const app = createApp();

describe("ChecklistItem routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/checklist-items");
    expect(res.status).toBe(401);
  });

  it("crea checklist item con token valido", async () => {
    const { token } = await createAdminAuth();
    const checklist = await createChecklist();

    const res = await request(app)
      .post("/checklist-items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        checklistId: checklist.id,
        descripcion: "Laptop asignada",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("checklistId", checklist.id);
  });
});
