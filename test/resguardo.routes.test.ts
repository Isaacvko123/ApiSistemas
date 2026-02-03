import request from "supertest";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";
import { createEmpleado } from "./utils/factories";

const app = createApp();

describe("Resguardo routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/resguardos");
    expect(res.status).toBe(401);
  });

  it("crea resguardo con token valido", async () => {
    const { token } = await createAdminAuth();
    const empleado = await createEmpleado({ nombre: "Empleado" });

    const res = await request(app)
      .post("/resguardos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        empleadoId: empleado.id,
        fechaInicio: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("empleadoId", empleado.id);
  });
});
