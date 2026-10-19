import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "../types/auth";

const HEADER_SEGMENT = Buffer.from(
  JSON.stringify({ alg: "HS256", typ: "JWT" }),
).toString("base64url");
const ROLES: readonly UserRole[] = ["user", "staff", "admin"];

export interface TokenClaims {
  sub: string;
  role: UserRole;
  ip: string | null;
  iat: number;
  exp: number;
}

export interface IssuedToken {
  token: string;
  expiresAt: string;
}

function sign(segment: string, secret: string): string {
  return createHmac("sha256", secret).update(segment).digest("base64url");
}

export function issueToken(
  userId: string,
  role: UserRole,
  ip: string | null,
  secret: string,
  ttlSeconds: number,
): IssuedToken {
  const issuedAt = Math.floor(Date.now() / 1000);
  const claims: TokenClaims = {
    sub: userId,
    role,
    ip,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };

  const payloadSegment = Buffer.from(JSON.stringify(claims)).toString(
    "base64url",
  );
  const signingInput = `${HEADER_SEGMENT}.${payloadSegment}`;

  return {
    token: `${signingInput}.${sign(signingInput, secret)}`,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

export function verifyToken(token: string, secret: string): TokenClaims {
  const segments = token.split(".");
  if (segments.length !== 3) throw new Error("Malformed token");

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  if (headerSegment !== HEADER_SEGMENT) {
    throw new Error("Unsupported token header");
  }

  const expected = Buffer.from(sign(`${headerSegment}.${payloadSegment}`, secret));
  const provided = Buffer.from(signatureSegment);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    throw new Error("Invalid token signature");
  }

  const claims = parseClaims(payloadSegment);
  if (claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return claims;
}

function parseClaims(segment: string): TokenClaims {
  const parsed: unknown = JSON.parse(
    Buffer.from(segment, "base64url").toString("utf8"),
  );
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Malformed token payload");
  }

  const claims = parsed as Record<string, unknown>;
  if (typeof claims.sub !== "string" || !claims.sub) {
    throw new Error("Malformed token payload");
  }
  if (typeof claims.role !== "string" || !ROLES.includes(claims.role as UserRole)) {
    throw new Error("Malformed token payload");
  }
  if (typeof claims.iat !== "number" || typeof claims.exp !== "number") {
    throw new Error("Malformed token payload");
  }

  return {
    sub: claims.sub,
    role: claims.role as UserRole,
    ip: typeof claims.ip === "string" ? claims.ip : null,
    iat: claims.iat,
    exp: claims.exp,
  };
}
