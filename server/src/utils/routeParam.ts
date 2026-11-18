import type { Request } from "express";
import { HttpError } from "./errors";

export function routeParam(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }

  return value;
}
