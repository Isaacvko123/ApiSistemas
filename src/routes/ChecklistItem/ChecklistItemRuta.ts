import { Router } from "express";
import { ChecklistItemController } from "../../controllers/ChecklistItem/ChecklistItemController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", ChecklistItemController.listar);
router.get("/:id", ChecklistItemController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), ChecklistItemController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), ChecklistItemController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), ChecklistItemController.eliminar);

export default router;
