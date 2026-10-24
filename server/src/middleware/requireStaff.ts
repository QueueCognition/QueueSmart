import type { RequestHandler } from "express";
import { AuthError } from "../utils/errors";
import { currentUser } from "../utils/currentUser";

export const requireStaff: RequestHandler = (_req, res, next) => {
  const user = currentUser(res);

  if (user.role !== "staff" && user.role !== "admin") {
    next(new AuthError("Staff access required", 403));
    return;
  }

  next();
};
