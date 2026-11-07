import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { issueToken, verifyToken } from "../../src/utils/token";

const SECRET = "unit-test-secret";
const OTHER_SECRET = "another-unit-test-secret";

function issued(ttlSeconds = 3600, tokenVersion = 0) {
  return issueToken(
    "u_demo",
    "user",
    "127.0.0.1",
    SECRET,
    ttlSeconds,
    tokenVersion,
  );
}

function signedToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

describe("issueToken", () => {
  it("issues a verifiable token with the expected claims", () => {
    const before = Math.floor(Date.now() / 1000);
    const { token, expiresAt } = issueToken(
      "u_admin",
      "admin",
      null,
      SECRET,
      3600,
      3,
    );
    const claims = verifyToken(token, SECRET);

    assert.equal(claims.sub, "u_admin");
    assert.equal(claims.role, "admin");
    assert.equal(claims.ip, null);
    assert.equal(claims.ver, 3);
    assert.ok(claims.iat >= before);
    assert.equal(claims.exp, claims.iat + 3600);
    assert.equal(new Date(expiresAt).getTime(), claims.exp * 1000);
  });
});

describe("verifyToken", () => {
  it("rejects a token signed with another secret", () => {
    assert.throws(
      () => verifyToken(issued().token, OTHER_SECRET),
      /Invalid token signature/,
    );
  });

  it("rejects a tampered payload", () => {
    const [header, payload, signature] = issued().token.split(".");
    assert.ok(payload);
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { role: string };
    claims.role = "admin";

    const forgedPayload = Buffer.from(JSON.stringify(claims)).toString(
      "base64url",
    );

    assert.throws(
      () => verifyToken(`${header}.${forgedPayload}.${signature}`, SECRET),
      /Invalid token signature/,
    );
  });

  it("rejects a tampered header", () => {
    const [, payload, signature] = issued().token.split(".");
    const forgedHeader = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
    ).toString("base64url");

    assert.throws(
      () => verifyToken(`${forgedHeader}.${payload}.${signature}`, SECRET),
      /Unsupported token header/,
    );
  });

  it("rejects an expired token", () => {
    assert.throws(() => verifyToken(issued(-60).token, SECRET), /Token expired/);
  });

  it("rejects malformed tokens", () => {
    assert.throws(() => verifyToken("not-a-token", SECRET), /Malformed token/);
    assert.throws(() => verifyToken("a.b", SECRET), /Malformed token/);
  });

  it("treats a token without a version claim as version 0", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signedToken({
      sub: "u_demo",
      role: "user",
      ip: null,
      iat: now,
      exp: now + 3600,
    });

    assert.equal(verifyToken(token, SECRET).ver, 0);
  });

  it("rejects a negative version claim", () => {
    assert.throws(
      () => verifyToken(issued(3600, -1).token, SECRET),
      /Malformed token payload/,
    );
  });
});
