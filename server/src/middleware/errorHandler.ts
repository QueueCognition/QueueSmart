import type { ErrorRequestHandler } from "express";
import { HttpError } from "../utils/errors";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      message: error.message,
      fieldErrors: error.fieldErrors,
    });
    return;
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({ message: "Malformed JSON body" });
    return;
  }

  res.status(500).json({ message: "Internal server error" });
};
