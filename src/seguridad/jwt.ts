import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export type AccessClaims = {
  sub: string;          // usuarioId
  rol: "ADMIN" | "SUPERVISOR" | "GERENTE";
  tv: number;           // tokenVersion
  sid: string;          // sesionId
  jti: string;          // token id
};

export type RefreshClaims = {
  sub: string;
  tv: number;
  sid: string;
  jti: string;
};

function newJti() {
  return crypto.randomUUID();
}

export function signAccessToken(input: Omit<AccessClaims, "jti">) {
  const payload: AccessClaims = { ...input, jti: newJti() };

  const opts: SignOptions = {
    expiresIn: env.jwtAccessTtl as SignOptions["expiresIn"], // "15m"
    algorithm: "HS256",
  };
  if (env.jwtIssuer) opts.issuer = env.jwtIssuer;
  if (env.jwtAudience) opts.audience = env.jwtAudience;

  return jwt.sign(payload, env.jwtAccessSecret, opts);
}

export function signRefreshToken(input: Omit<RefreshClaims, "jti">) {
  const payload: RefreshClaims = { ...input, jti: newJti() };

  const opts: SignOptions = {
    expiresIn: (`${env.jwtRefreshTtlDays}d`) as SignOptions["expiresIn"],
    algorithm: "HS256",
  };
  if (env.jwtIssuer) opts.issuer = env.jwtIssuer;
  if (env.jwtAudience) opts.audience = env.jwtAudience;

  return jwt.sign(payload, env.jwtRefreshSecret, opts);
}

export function verifyAccessToken(token: string): AccessClaims {
  const verifyOpts: jwt.VerifyOptions = {
    algorithms: ["HS256"],
  };
  if (env.jwtIssuer) verifyOpts.issuer = env.jwtIssuer;
  if (env.jwtAudience) verifyOpts.audience = env.jwtAudience;
  const decoded = jwt.verify(token, env.jwtAccessSecret, verifyOpts) as JwtPayload;
  assertAccessClaims(decoded);
  return decoded as unknown as AccessClaims;
}

export function verifyRefreshToken(token: string): RefreshClaims {
  const verifyOpts: jwt.VerifyOptions = {
    algorithms: ["HS256"],
  };
  if (env.jwtIssuer) verifyOpts.issuer = env.jwtIssuer;
  if (env.jwtAudience) verifyOpts.audience = env.jwtAudience;
  const decoded = jwt.verify(token, env.jwtRefreshSecret, verifyOpts) as JwtPayload;
  assertRefreshClaims(decoded);
  return decoded as unknown as RefreshClaims;
}

function assertAccessClaims(decoded: JwtPayload): asserts decoded is AccessClaims {
  if (
    typeof decoded?.sub !== "string" ||
    typeof decoded?.sid !== "string" ||
    typeof decoded?.tv !== "number" ||
    typeof decoded?.rol !== "string"
  ) {
    throw new Error("access token inválido");
  }
}

function assertRefreshClaims(decoded: JwtPayload): asserts decoded is RefreshClaims {
  if (
    typeof decoded?.sub !== "string" ||
    typeof decoded?.sid !== "string" ||
    typeof decoded?.tv !== "number"
  ) {
    throw new Error("refresh token inválido");
  }
}
