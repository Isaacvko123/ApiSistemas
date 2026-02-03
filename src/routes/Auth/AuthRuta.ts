import { Router } from "express";
import { AuthController } from "../../controllers/Auth/AuthController";

const router = Router();

router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.post("/logout-all", AuthController.logoutAll);

export default router;
