import { Router } from "express";
import { EquipoController } from "../../controllers/Equipo/EquipoController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", EquipoController.listar);
router.get("/:id", EquipoController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), EquipoController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), EquipoController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), EquipoController.eliminar);

export default router;
