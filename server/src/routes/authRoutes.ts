import { Router } from "express";
import {
  changePasswordHandler,
  getProfileHandler,
  getSessionHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  requestPasswordResetHandler,
  updateProfileHandler,
} from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

authRouter.post("/register", registerHandler);
authRouter.post("/login", loginHandler);
authRouter.post("/logout", logoutHandler);
authRouter.post("/password-reset", requestPasswordResetHandler);
authRouter.get("/session", requireAuth, getSessionHandler);
authRouter.get("/profile", requireAuth, getProfileHandler);
authRouter.patch("/profile", requireAuth, updateProfileHandler);
authRouter.post("/password-change", requireAuth, changePasswordHandler);
