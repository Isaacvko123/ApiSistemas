import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";
import { createPuesto } from "./utils/factories";

const app = createApp();

describe("Checklist routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/checklists");
    expect(res.status).toBe(401);
  });

  it("crea checklist con token valido", async () => {
    const { token } = await createAdminAuth();
    const puesto = await createPuesto();

    const res = await request(app)
      .post("/checklists")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Onboarding",
        puestoId: puesto.id,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("puestoId", puesto.id);
  });
});
