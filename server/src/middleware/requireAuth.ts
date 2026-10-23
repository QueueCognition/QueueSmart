import type { RequestHandler } from "express";
import { verifySession } from "../services/authService";
import { AuthError } from "../utils/errors";
import { clientIp } from "../utils/requestIp";

const BEARER_PREFIX = "Bearer ";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith(BEARER_PREFIX)
    ? header.slice(BEARER_PREFIX.length).trim()
    : "";

  if (!token) {
    next(new AuthError("Authentication required", 401));
    return;
  }

  try {
    res.locals.user = await verifySession(token, clientIp(req));
    next();
  } catch (error) {
    next(error);
  }
};
