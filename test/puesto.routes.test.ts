import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";
import { createArea } from "./utils/factories";

const app = createApp();

describe("Puesto routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/puestos");
    expect(res.status).toBe(401);
  });

  it("crea puesto con token valido", async () => {
    const { token } = await createAdminAuth();
    const area = await createArea({ nombre: "IT" });

    const res = await request(app)
      .post("/puestos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Soporte", areaId: area.id });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("areaId", area.id);
  });
});
