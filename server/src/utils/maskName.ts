export function maskPatientName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  if (!first) return "";

  const firstPart = Array.from(first).slice(0, 3).join("");

  const last = rest[rest.length - 1];
  const lastInitial = last ? (Array.from(last)[0] ?? "").toUpperCase() : "";

  return lastInitial ? `${firstPart} ${lastInitial}.` : firstPart;
}
