import type { Request, Response } from "express";
import { rotateAllCredencialesWeb } from "../../seguridad/rotate-credentials";

export class AdminController {
  static async rotateCredenciales(_req: Request, res: Response) {
    const rotated = await rotateAllCredencialesWeb();
    return res.status(200).json({ rotated });
  }
}
