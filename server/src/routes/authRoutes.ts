import { Router } from "express";
import {
  getSessionHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  requestPasswordResetHandler,
} from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

authRouter.post("/register", registerHandler);
authRouter.post("/login", loginHandler);
authRouter.post("/logout", logoutHandler);
authRouter.post("/password-reset", requestPasswordResetHandler);
authRouter.get("/session", requireAuth, getSessionHandler);
