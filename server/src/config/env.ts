import "dotenv/config";

const DEFAULT_PORT = 4000;
const DEFAULT_API_PREFIX = "/api";
const DEFAULT_CORS_ORIGIN = "http://localhost:5173";
const DEFAULT_DATABASE_URL = "./data/queuesmart.db";
const DEFAULT_TOKEN_TTL_SECONDS = 8 * 60 * 60;
const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

function readString(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}

function readPort(fallback: number): number {
  const port = Number(process.env.PORT);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
}

function readTtlSeconds(value: string, fallback: number): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    const seconds = Number(value);
    return Number.isInteger(seconds) && seconds > 0 ? seconds : fallback;
  }
  const amount = match[1];
  const unit = match[2];

  if (
    amount === undefined ||
    unit === undefined ||
    UNIT_SECONDS[unit] === undefined
  ) {
    throw new Error("Invalid duration format");
  }

  return Number(amount) * UNIT_SECONDS[unit];
}

const nodeEnv = readString("NODE_ENV", "development");

if (nodeEnv === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

export const config = {
  port: readPort(DEFAULT_PORT),
  apiPrefix: readString("API_PREFIX", DEFAULT_API_PREFIX),
  corsOrigin: readString("CORS_ORIGIN", DEFAULT_CORS_ORIGIN),
  databaseUrl: readString("DATABASE_URL", DEFAULT_DATABASE_URL),
  jwtSecret: readString("JWT_SECRET", "queuesmart-development-secret"),
  tokenTtlSeconds: readTtlSeconds(
    readString("JWT_EXPIRES_IN", "8h"),
    DEFAULT_TOKEN_TTL_SECONDS,
  ),
} as const;
