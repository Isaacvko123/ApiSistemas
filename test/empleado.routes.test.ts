import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";

const app = createApp();

describe("Empleado routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/empleados");
    expect(res.status).toBe(401);
  });

  it("crea empleado con token valido", async () => {
    const { token } = await createAdminAuth();

    const res = await request(app)
      .post("/empleados")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Juan Perez" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("nombre", "Juan Perez");
  });
});
