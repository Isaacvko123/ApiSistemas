import {
  toUsuarioCreateData,
  toUsuarioPublic,
  toUsuarioUpdateData,
  usuarioCreateSchema,
  usuarioUpdateSchema,
} from "../src/models/Usuario/UsuarioModel";
import { verifyPassword } from "../src/seguridad/hash";
import { type Usuario } from "@prisma/client";

describe("UsuarioModel", () => {
  it("rechaza payload inválido en create", () => {
    const result = usuarioCreateSchema.safeParse({ nombre: "A" });
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = usuarioUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });

  it("hashea la contraseña al crear", async () => {
    const data = await toUsuarioCreateData({
      nombre: "Test User",
      email: "test@example.com",
      contrasena: "PasswordSegura123",
      rol: "ADMIN",
    });

    expect(data.contrasena).not.toBe("PasswordSegura123");
    const ok = await verifyPassword(data.contrasena, "PasswordSegura123");
    expect(ok).toBe(true);
  });

  it("solo hashea contraseña si viene en update", async () => {
    const data = await toUsuarioUpdateData({ nombre: "Nuevo Nombre" });
    expect("contrasena" in data).toBe(false);

    const data2 = await toUsuarioUpdateData({ contrasena: "PasswordSegura123" });
    const ok = await verifyPassword(data2.contrasena as string, "PasswordSegura123");
    expect(ok).toBe(true);
  });

  it("excluye campos sensibles en toUsuarioPublic", () => {
    const usuario: Usuario = {
      id: 1,
      nombre: "User",
      email: "user@example.com",
      contrasena: "hash",
      rol: "SUPERVISOR",
      activo: true,
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pub = toUsuarioPublic(usuario);
    expect((pub as any).contrasena).toBeUndefined();
    expect((pub as any).tokenVersion).toBeUndefined();
  });
});
