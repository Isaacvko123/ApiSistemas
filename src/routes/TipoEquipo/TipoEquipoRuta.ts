import { Router } from "express";
import { TipoEquipoController } from "../../controllers/TipoEquipo/TipoEquipoController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", TipoEquipoController.listar);
router.get("/:id", TipoEquipoController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), TipoEquipoController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), TipoEquipoController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), TipoEquipoController.eliminar);

export default router;
