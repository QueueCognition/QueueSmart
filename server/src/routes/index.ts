import { Router } from "express";
import { authRouter } from "./authRoutes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
