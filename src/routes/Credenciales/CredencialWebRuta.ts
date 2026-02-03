import { Router } from "express";
import { CredencialWebController } from "../../controllers/Credenciales/CredencialWebController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

// Lectura general (sin password)
router.get("/", CredencialWebController.listar);
router.get("/:id", CredencialWebController.obtener);

// Lectura de secreto (solo ADMIN/GERENTE)
router.get("/:id/secret", requireRoles(["ADMIN", "GERENTE"]), CredencialWebController.obtenerSecreto);

// Escritura (solo ADMIN/GERENTE)
router.post("/", requireRoles(["ADMIN", "GERENTE"]), CredencialWebController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), CredencialWebController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), CredencialWebController.eliminar);

export default router;
