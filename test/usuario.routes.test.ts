import request from "supertest";
import crypto from "crypto";
import { createApp } from "../src/servidor/servidor";
import { prisma } from "../src/db/prisma";
import { signAccessToken } from "../src/seguridad/jwt";
import { toUsuarioCreateData } from "../src/models/Usuario/UsuarioModel";
import { truncateAll, disconnect } from "./utils/db";

const app = createApp();

describe("Usuarios routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("crea usuario (publico temporal)", async () => {
    const res = await request(app).post("/usuarios").send({
      nombre: "Ana",
      email: "ana@empresa.com",
      contrasena: "PasswordSegura123",
      rol: "ADMIN",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email", "ana@empresa.com");
    expect(res.body).not.toHaveProperty("contrasena");
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(401);
  });

  it("lista usuarios con token valido", async () => {
    const data = await toUsuarioCreateData({
      nombre: "Test",
      email: "test@empresa.com",
      contrasena: "PasswordSegura123",
      rol: "ADMIN",
    });
    const created = await prisma.usuario.create({ data });

    const sessionId = crypto.randomUUID();
    await prisma.sesion.create({
      data: {
        id: sessionId,
        usuarioId: created.id,
        refreshHash: "test",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastUsedAt: new Date(),
      },
    });

    const token = signAccessToken({
      sub: String(created.id),
      rol: "ADMIN",
      tv: 0,
      sid: sessionId,
    });

    const res = await request(app)
      .get("/usuarios")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it("rechaza duplicado de email", async () => {
    const first = await request(app).post("/usuarios").send({
      nombre: "Ana",
      email: "ana@empresa.com",
      contrasena: "PasswordSegura123",
      rol: "ADMIN",
    });

    const sessionId = crypto.randomUUID();
    await prisma.sesion.create({
      data: {
        id: sessionId,
        usuarioId: first.body.id,
        refreshHash: "test",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        lastUsedAt: new Date(),
      },
    });

    const token = signAccessToken({
      sub: String(first.body.id),
      rol: "ADMIN",
      tv: 0,
      sid: sessionId,
    });

    const res = await request(app).post("/usuarios").send({
      nombre: "Otra",
      email: "ana@empresa.com",
      contrasena: "PasswordSegura123",
      rol: "SUPERVISOR",
    }).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });
});
