import { Router } from "express";
import { DocumentoController } from "../../controllers/Documento/DocumentoController";
import { requireRoles } from "../../middlewares/auth";
import { uploadDocumento } from "../../middlewares/upload";

const router = Router();

router.get("/", DocumentoController.listar);
router.get("/:id", DocumentoController.obtener);
router.post(
  "/upload",
  requireRoles(["ADMIN", "GERENTE"]),
  uploadDocumento,
  DocumentoController.subir,
);
router.post("/", requireRoles(["ADMIN", "GERENTE"]), DocumentoController.crear);
router.patch("/:id", requireRoles(["ADMIN", "GERENTE"]), DocumentoController.actualizar);
router.delete("/:id", requireRoles(["ADMIN", "GERENTE"]), DocumentoController.eliminar);

export default router;
