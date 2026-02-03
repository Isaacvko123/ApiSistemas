import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(6000),

  DATABASE_URL: z.string().min(1),
  SHADOW_DATABASE_URL: z.string().optional(),

  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  CORS_ORIGINS: z.string().optional(), // CSV: https://app.com,https://admin.app.com
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  BODY_LIMIT: z.string().default("1mb"),

  JWT_ISSUER: z.string().min(1).optional(),
  JWT_AUDIENCE: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(20),
  JWT_REFRESH_SECRET: z.string().min(20),
  JWT_ACCESS_TTL: z.string().min(2).default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  CREDENTIALS_ENC_KEY: z.string().min(1),
  CREDENTIALS_ENC_KEY_V1: z.string().min(1).optional(),

  ROTATE_CREDENTIALS_ENABLED: z.coerce.boolean().default(false),
  ROTATE_CREDENTIALS_CRON: z.string().default("0 3 * * *"),
  ROTATE_CREDENTIALS_TZ: z.string().optional(),

  BOOTSTRAP_ADMIN_ENABLED: z.coerce.boolean().default(true),
  BOOTSTRAP_ADMIN_NAME: z.string().min(1).optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(1).optional(),
  BOOTSTRAP_ADMIN_ROLE: z.enum(["ADMIN", "SUPERVISOR", "GERENTE"]).default("ADMIN"),
}).superRefine((data, ctx) => {
  if (data.BOOTSTRAP_ADMIN_ENABLED) {
    if (!data.BOOTSTRAP_ADMIN_NAME) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BOOTSTRAP_ADMIN_NAME"],
        message: "BOOTSTRAP_ADMIN_NAME es requerido cuando BOOTSTRAP_ADMIN_ENABLED=true",
      });
    }
    if (!data.BOOTSTRAP_ADMIN_EMAIL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BOOTSTRAP_ADMIN_EMAIL"],
        message: "BOOTSTRAP_ADMIN_EMAIL es requerido cuando BOOTSTRAP_ADMIN_ENABLED=true",
      });
    }
    if (!data.BOOTSTRAP_ADMIN_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BOOTSTRAP_ADMIN_PASSWORD"],
        message: "BOOTSTRAP_ADMIN_PASSWORD es requerido cuando BOOTSTRAP_ADMIN_ENABLED=true",
      });
    }
  }
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[ENV] inválido:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  shadowDatabaseUrl: parsed.data.SHADOW_DATABASE_URL,

  trustProxy: parsed.data.TRUST_PROXY,
  corsOrigins: parsed.data.CORS_ORIGINS,
  rateLimitWindowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: parsed.data.RATE_LIMIT_MAX,
  bodyLimit: parsed.data.BODY_LIMIT,

  jwtIssuer: parsed.data.JWT_ISSUER,
  jwtAudience: parsed.data.JWT_AUDIENCE,
  jwtAccessSecret: parsed.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  jwtAccessTtl: parsed.data.JWT_ACCESS_TTL,
  jwtRefreshTtlDays: parsed.data.JWT_REFRESH_TTL_DAYS,

  credentialsEncKey: parsed.data.CREDENTIALS_ENC_KEY,
  credentialsEncKeyV1: parsed.data.CREDENTIALS_ENC_KEY_V1,

  rotateCredentialsEnabled: parsed.data.ROTATE_CREDENTIALS_ENABLED,
  rotateCredentialsCron: parsed.data.ROTATE_CREDENTIALS_CRON,
  rotateCredentialsTz: parsed.data.ROTATE_CREDENTIALS_TZ,

  bootstrapAdminEnabled: parsed.data.BOOTSTRAP_ADMIN_ENABLED,
  bootstrapAdminName: parsed.data.BOOTSTRAP_ADMIN_NAME,
  bootstrapAdminEmail: parsed.data.BOOTSTRAP_ADMIN_EMAIL,
  bootstrapAdminPassword: parsed.data.BOOTSTRAP_ADMIN_PASSWORD,
  bootstrapAdminRole: parsed.data.BOOTSTRAP_ADMIN_ROLE,
};
