import request from "supertest";
import fs from "fs";
import path from "path";
import { createApp } from "../src/servidor/servidor";
import { truncateAll, disconnect } from "./utils/db";
import { createAdminAuth } from "./utils/auth";
import { createResguardo } from "./utils/factories";

const app = createApp();

describe("Documento routes", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("bloquea acceso sin token", async () => {
    const res = await request(app).get("/documentos");
    expect(res.status).toBe(401);
  });

  it("crea documento con token valido", async () => {
    const { token } = await createAdminAuth();
    const resguardo = await createResguardo();

    const res = await request(app)
      .post("/documentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tipo: "RESGUARDO",
        ruta: "/uploads/resguardos/folio-1.pdf",
        resguardoId: resguardo.id,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("resguardoId", resguardo.id);
  });

  it("sube documento con archivo", async () => {
    const { token } = await createAdminAuth();
    const resguardo = await createResguardo();

    const tmpDir = path.join(process.cwd(), "test", "tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, "test.pdf");
    fs.writeFileSync(filePath, Buffer.from("%PDF-1.4 test"));

    let hasMulter = true;
    try {
      require.resolve("multer");
    } catch {
      hasMulter = false;
    }

    const res = await request(app)
      .post("/documentos/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("tipo", "RESGUARDO")
      .field("resguardoId", String(resguardo.id))
      .attach("file", filePath);

    if (hasMulter) {
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("resguardoId", resguardo.id);
    } else {
      expect(res.status).toBe(501);
    }

    fs.unlinkSync(filePath);
  });
});
