import { Router } from "express";
import { ChecklistController } from "../../controllers/Checklist/ChecklistController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", ChecklistController.listar);
router.get("/:id", ChecklistController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), ChecklistController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), ChecklistController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), ChecklistController.eliminar);

export default router;
