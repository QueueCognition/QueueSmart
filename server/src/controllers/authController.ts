import type { RequestHandler } from "express";
import {
  login,
  register,
  requestPasswordReset,
} from "../services/authService";
import type { AuthSession, PasswordResetResult, User } from "../types/auth";
import { AuthError } from "../utils/errors";
import { clientIp } from "../utils/requestIp";
import {
  validateLogin,
  validatePasswordReset,
  validateRegister,
} from "../validators/authValidators";

export const loginHandler: RequestHandler = async (req, res) => {
  const session: AuthSession = await login(
    validateLogin(req.body),
    clientIp(req),
  );

  res.status(200).json(session);
};

export const registerHandler: RequestHandler = async (req, res) => {
  const session: AuthSession = await register(
    validateRegister(req.body),
    clientIp(req),
  );

  res.status(201).json(session);
};

export const logoutHandler: RequestHandler = (_req, res) => {
  res.status(204).end();
};

export const requestPasswordResetHandler: RequestHandler = async (req, res) => {
  const result: PasswordResetResult = await requestPasswordReset(
    validatePasswordReset(req.body).email,
  );

  res.status(200).json(result);
};

export const getSessionHandler: RequestHandler = (_req, res) => {
  const user: User | undefined = res.locals.user;
  if (!user) throw new AuthError("Authentication required", 401);

  res.status(200).json({ user });
};
