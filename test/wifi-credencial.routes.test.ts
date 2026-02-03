import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";

const app = createApp();

describe("WifiCredencial routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/wifi-credenciales");
    expect(res.status).toBe(401);
  });

  it("crea wifi credencial con token valido", async () => {
    const { token } = await createAdminAuth();

    const res = await request(app)
      .post("/wifi-credenciales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ssid: "CORP-WIFI",
        usuario: "corp-user",
        password: "WifiSecreta123",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("ssid", "CORP-WIFI");
  });

  it("devuelve secreto solo con rol permitido", async () => {
    const { token } = await createAdminAuth();
    const create = await request(app)
      .post("/wifi-credenciales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ssid: "CORP-WIFI",
        usuario: "corp-user",
        password: "WifiSecreta123",
      });

    const res = await request(app)
      .get(`/wifi-credenciales/${create.body.id}/secret`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("password", "WifiSecreta123");
  });
});
