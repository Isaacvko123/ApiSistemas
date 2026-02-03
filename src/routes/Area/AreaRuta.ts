import { Router } from "express";
import { AreaController } from "../../controllers/Area/AreaController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", AreaController.listar);
router.get("/:id", AreaController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), AreaController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), AreaController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), AreaController.eliminar);

export default router;
