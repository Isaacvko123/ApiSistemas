// src/index.ts
import { iniciarServidor } from "./servidor/servidor";

iniciarServidor().catch((err) => {
  console.error("[BOOT] Error al iniciar servidor:", err);
  process.exit(1);
});
