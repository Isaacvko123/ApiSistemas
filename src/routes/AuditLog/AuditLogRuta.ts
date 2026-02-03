import { Router } from "express";
import { AuditLogController } from "../../controllers/AuditLog/AuditLogController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", requireRoles(["ADMIN", "GERENTE"]), AuditLogController.listar);
router.get("/:id", requireRoles(["ADMIN", "GERENTE"]), AuditLogController.obtener);

export default router;
