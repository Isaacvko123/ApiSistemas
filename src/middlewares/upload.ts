import type { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env";

const BASE_DIR = path.join(process.cwd(), env.uploadDir, "documentos");
const MAX_SIZE_BYTES = env.uploadMaxSizeMb * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);

function ensureDir() {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

function buildUpload() {
  // Lazy require para evitar crashear si multer no está instalado.
  // Cuando falte, devolvemos un error controlado.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const multer = require("multer");

  const storage = multer.diskStorage({
    destination: (_req: Request, _file: any, cb: (err: any, dest: string) => void) => {
      ensureDir();
      cb(null, BASE_DIR);
    },
    filename: (_req: Request, file: any, cb: (err: any, filename: string) => void) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
      cb(null, safeName);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter: (_req: Request, file: any, cb: (err: any, accept: boolean) => void) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new Error("tipo de archivo no permitido"), false);
      }
      return cb(null, true);
    },
  });
}

export function uploadDocumento(req: Request, res: Response, next: NextFunction) {
  let upload: any;
  try {
    upload = buildUpload();
  } catch (error) {
    return res.status(501).json({
      error: "upload no disponible",
      detail: "Instala la dependencia multer para habilitar uploads.",
    });
  }

  const handler = upload.single("file");
  handler(req, res, (err: unknown) => {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return next();
  });
}

export function buildDocumentoRuta(filename: string): string {
  const ruta = path.posix.join("/", env.uploadDir, "documentos", filename);
  return ruta;
}
