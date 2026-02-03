// src/seguridad/hash.ts
import argon2, { type Options } from "argon2";

/**
 * Parámetros Argon2 (equilibrio seguridad/rendimiento para API).
 * Ajusta si tu VPS/CPU lo requiere.
 */
const BASE_OPTIONS: Options & { raw?: false } = {
  type: argon2.argon2id,
  timeCost: 3,
  memoryCost: 19456, // ~19 MB
  parallelism: 1,
};

/** Hashea contraseña (se guarda en Usuario.contrasena). */
export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 10) {
    throw new Error("password inválida (mínimo 10 caracteres)");
  }
  return argon2.hash(plain, BASE_OPTIONS);
}

/** Verifica contraseña contra hash almacenado. */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  if (!hash || !plain) return false;
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Hashea refresh token (se guarda en Sesion.refreshHash).
 * Nota: el refresh token NUNCA se guarda en texto plano.
 */
export async function hashRefreshToken(token: string): Promise<string> {
  if (!token || token.length < 20) {
    throw new Error("refresh token inválido");
  }
  // Mismo esquema Argon2id
  return argon2.hash(token, BASE_OPTIONS);
}

/** Verifica refresh token contra el hash almacenado en sesión. */
export async function verifyRefreshTokenHash(hash: string, token: string): Promise<boolean> {
  if (!hash || !token) return false;
  try {
    return await argon2.verify(hash, token);
  } catch {
    return false;
  }
}
