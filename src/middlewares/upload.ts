import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env";

const BASE_DIR = path.join(process.cwd(), env.uploadDir, "documentos");
const MAX_SIZE_BYTES = env.uploadMaxSizeMb * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function ensureDir() {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDir();
    cb(null, BASE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("tipo de archivo no permitido"));
    }
    return cb(null, true);
  },
});

export function uploadDocumento(req: Request, res: Response, next: NextFunction) {
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
