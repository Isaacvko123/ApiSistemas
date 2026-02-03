import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });
dotenv.config();

process.env.NODE_ENV = "test";

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL_TEST es requerido para pruebas. Configura .env.test o variable de entorno.",
  );
}
