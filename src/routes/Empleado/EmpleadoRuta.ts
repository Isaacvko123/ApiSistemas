import { Router } from "express";
import { EmpleadoController } from "../../controllers/Empleado/EmpleadoController";
import { requireRoles } from "../../middlewares/auth";

const router = Router();

router.get("/", EmpleadoController.listar);
router.get("/:id", EmpleadoController.obtener);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), EmpleadoController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), EmpleadoController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), EmpleadoController.eliminar);

export default router;
