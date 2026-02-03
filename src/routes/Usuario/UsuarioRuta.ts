import { Router } from "express";
import { UsuarioController } from "../../controllers/Usuarios/UsuarioController";
import { requireRoles, requireRolesOrBootstrap } from "../../middlewares/auth";

const router = Router();

// Público solo si no existe ningún usuario (bootstrap)
router.post("/", requireRolesOrBootstrap(["ADMIN", "GERENTE"]), UsuarioController.crear);

// Protegidas
router.get("/", UsuarioController.listar);
router.get("/:id", UsuarioController.obtener);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), UsuarioController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), UsuarioController.desactivar);

export default router;
