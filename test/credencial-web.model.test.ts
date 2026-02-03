import {
  credencialWebCreateSchema,
  credencialWebUpdateSchema,
  toCredencialWebCreateData,
  toCredencialWebUpdateData,
} from "../src/models/Credenciales/CredencialWebModel";

describe("CredencialWebModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = credencialWebCreateSchema.safeParse({ nombre: "X" });
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = credencialWebUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });

  it("cifra password en create", () => {
    const data = toCredencialWebCreateData({
      nombre: "Servicio",
      url: "https://example.com",
      usuario: "user",
      password: "Secreto123",
    });

    expect(data.passwordEnc).toBeDefined();
    expect(data.passwordEnc).not.toBe("Secreto123");
    expect(data.passwordIv).toBeDefined();
  });

  it("solo cifra si password viene en update", () => {
    const update = toCredencialWebUpdateData({ nombre: "Otro" });
    expect(update.passwordEnc).toBeUndefined();

    const update2 = toCredencialWebUpdateData({ password: "Nueva" });
    expect(update2.passwordEnc).toBeDefined();
    expect(update2.passwordIv).toBeDefined();
  });
});
