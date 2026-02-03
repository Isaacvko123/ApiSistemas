import cron from "node-cron";
import { env } from "../config/env";
import { rotateAllCredencialesWeb } from "./rotate-credentials";

export function startRotateCredentialsCron(): void {
  if (env.nodeEnv === "test") return;
  if (!env.rotateCredentialsEnabled) return;

  cron.schedule(
    env.rotateCredentialsCron,
    async () => {
      try {
        const rotated = await rotateAllCredencialesWeb();
        console.log(`[CRON] Rotación credenciales completada. Registros: ${rotated}`);
      } catch (error) {
        console.error("[CRON] Error al rotar credenciales:", error);
      }
    },
    {
      timezone: env.rotateCredentialsTz,
    },
  );
}
