import { Router } from "express";
import { LocalidadController } from "../../controllers/Localidad/LocalidadController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", LocalidadController.listar);
router.get("/:id", LocalidadController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), LocalidadController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), LocalidadController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), LocalidadController.eliminar);

export default router;