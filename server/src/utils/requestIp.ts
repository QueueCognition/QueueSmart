import type { Request } from "express";

export function clientIp(req: Request): string | null {
  const address = req.ip ?? req.socket.remoteAddress ?? null;
  if (!address) return null;

  return address.startsWith("::ffff:") ? address.slice(7) : address;
}
