const { execSync } = require("child_process");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.test" });
dotenv.config();

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_TEST es requerido para pruebas.");
}

const url = new URL(process.env.DATABASE_URL);
const dbName = url.pathname.replace("/", "").toLowerCase();
if (!dbName.includes("test")) {
  throw new Error(
    `Refusing to reset non-test database "${dbName}". Usa una DB *_test.`,
  );
}

execSync("npx prisma@7.3.0 db push --force-reset", { stdio: "inherit" });
