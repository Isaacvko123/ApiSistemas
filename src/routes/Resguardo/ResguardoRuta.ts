import { Router } from "express";
import { ResguardoController } from "../../controllers/Resguardo/ResguardoController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", ResguardoController.listar);
router.get("/:id", ResguardoController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), ResguardoController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), ResguardoController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), ResguardoController.eliminar);

export default router;
