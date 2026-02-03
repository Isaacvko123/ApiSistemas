import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  contrasena: z.string().min(10).max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
