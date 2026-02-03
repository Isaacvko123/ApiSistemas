import { Router } from "express";
import { AdminController } from "../../controllers/Admin/AdminController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.post("/rotate-credentials", requireRoles(["ADMIN"]), AdminController.rotateCredenciales);

export default router;
