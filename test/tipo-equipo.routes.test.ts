import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";

const app = createApp();

describe("TipoEquipo routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/tipos-equipo");
    expect(res.status).toBe(401);
  });

  it("crea tipo de equipo con token valido", async () => {
    const { token } = await createAdminAuth();

    const res = await request(app)
      .post("/tipos-equipo")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Laptop", descripcion: "Equipo portatil" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("nombre", "Laptop");
  });

  it("actualiza tipo de equipo con token valido", async () => {
    const { token } = await createAdminAuth();

    const created = await request(app)
      .post("/tipos-equipo")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Monitor", descripcion: "Pantalla" });

    const res = await request(app)
      .patch(`/tipos-equipo/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ descripcion: "Pantalla 27" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("descripcion", "Pantalla 27");
  });

  it("elimina tipo de equipo con token valido", async () => {
    const { token } = await createAdminAuth();

    const created = await request(app)
      .post("/tipos-equipo")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Mouse" });

    const res = await request(app)
      .delete(`/tipos-equipo/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
