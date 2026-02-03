import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";

const app = createApp();

describe("CredencialWeb routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/credenciales");
    expect(res.status).toBe(401);
  });

  it("crea credencial con token valido", async () => {
    const { token } = await createAdminAuth();

    const res = await request(app)
      .post("/credenciales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "GitHub",
        url: "https://github.com",
        usuario: "dev",
        password: "Secreto123",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("nombre", "GitHub");
    expect(res.body).not.toHaveProperty("password");
  });
});
