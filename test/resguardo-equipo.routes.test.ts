import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";
import { createResguardo, createEquipo } from "./utils/factories";

const app = createApp();

describe("ResguardoEquipo routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/resguardo-equipos");
    expect(res.status).toBe(401);
  });

  it("crea resguardo-equipo con token valido", async () => {
    const { token } = await createAdminAuth();
    const resguardo = await createResguardo();
    const equipo = await createEquipo();

    const res = await request(app)
      .post("/resguardo-equipos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        resguardoId: resguardo.id,
        equipoId: equipo.id,
        fechaEntrega: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("resguardoId", resguardo.id);
  });
});
