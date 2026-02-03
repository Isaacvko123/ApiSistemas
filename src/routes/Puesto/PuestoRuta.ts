import { Router } from "express";
import { PuestoController } from "../../controllers/Puesto/PuestoController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", PuestoController.listar);
router.get("/:id", PuestoController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), PuestoController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), PuestoController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), PuestoController.eliminar);

export default router;
