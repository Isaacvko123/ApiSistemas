import {
  wifiCredencialCreateSchema,
  wifiCredencialUpdateSchema,
} from "../src/models/WifiCredencial/WifiCredencialModel";

describe("WifiCredencialModel", () => {
  it("rechaza payload invalido en create", () => {
    const result = wifiCredencialCreateSchema.safeParse({ ssid: "X" });
    expect(result.success).toBe(false);
  });

  it("rechaza campos desconocidos en update", () => {
    const result = wifiCredencialUpdateSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
