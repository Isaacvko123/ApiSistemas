import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";

const app = createApp();

describe("Area routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/areas");
    expect(res.status).toBe(401);
  });

  it("crea area con token valido", async () => {
    const { token } = await createAdminAuth();

    const res = await request(app)
      .post("/areas")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Sistemas" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("nombre", "Sistemas");
  });
});
