import { Router } from "express";
import { WifiCredencialController } from "../../controllers/WifiCredencial/WifiCredencialController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", WifiCredencialController.listar);
router.get("/:id", WifiCredencialController.obtener);
router.get(
  "/:id/secret",
  requireRoles(["ADMIN", "GERENTE"]),
  WifiCredencialController.obtenerSecreto,
);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), WifiCredencialController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), WifiCredencialController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), WifiCredencialController.eliminar);

export default router;
