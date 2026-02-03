import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

type KeyVersion = 1 | 2;

const KEY_VERSION: KeyVersion = env.credentialsEncKeyV1 ? 2 : 1;
export const CURRENT_KEY_VERSION: KeyVersion = KEY_VERSION;

function getKey(version: KeyVersion = KEY_VERSION): Buffer {
  const raw =
    version === 2
      ? env.credentialsEncKey
      : env.credentialsEncKeyV1 ?? env.credentialsEncKey;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CREDENTIALS_ENC_KEY debe ser base64 de 32 bytes");
  }
  return key;
}

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: KeyVersion;
};

export function encryptSecret(plain: string): EncryptedPayload {
  if (!plain) {
    throw new Error("texto vacío");
  }

  const key = getKey(KEY_VERSION);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = getKey(payload.keyVersion);
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

export function rotateEncrypted(payload: EncryptedPayload): EncryptedPayload {
  if (payload.keyVersion === CURRENT_KEY_VERSION) return payload;
  const plain = decryptSecret(payload);
  return encryptSecret(plain);
}
