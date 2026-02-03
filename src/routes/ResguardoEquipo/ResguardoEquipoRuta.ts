import { Router } from "express";
import { ResguardoEquipoController } from "../../controllers/ResguardoEquipo/ResguardoEquipoController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", ResguardoEquipoController.listar);
router.get("/:id", ResguardoEquipoController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), ResguardoEquipoController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), ResguardoEquipoController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), ResguardoEquipoController.eliminar);

export default router;
