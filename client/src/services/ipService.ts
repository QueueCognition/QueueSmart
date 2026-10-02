export const IP_LOOKUP_URL: string =
  import.meta.env.VITE_IP_LOOKUP_URL ?? "https://api.ipify.org?format=json";

let cachedIp: string | null = null;
let inFlight: Promise<string | null> | null = null;

export async function getClientIp(): Promise<string | null> {
  if (cachedIp) return cachedIp;

  if (!inFlight) {
    inFlight = lookupIp();
  }

  const pending: Promise<string | null> = inFlight;
  const ip = await pending;
  inFlight = null;
  return ip;
}

async function lookupIp(): Promise<string | null> {
  try {
    const response = await fetch(IP_LOOKUP_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { ip?: string };
    cachedIp = payload.ip?.trim() || null;
    return cachedIp;
  } catch {
    return null;
  }
}
