const VISIBLE_FIRST_NAME_LETTERS = 3;

function capitalizeWord(word: string): string {
  const [first = "", ...rest] = Array.from(word);
  return first.toUpperCase() + rest.join("").toLowerCase();
}

function normalizeNameCase(word: string): string {
  const isUniformCase =
    word === word.toLowerCase() || word === word.toUpperCase();
  const hasApostrophe = word.includes("'");

  return isUniformCase && !hasApostrophe ? capitalizeWord(word) : word;
}

export function maskPatientName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const [first, ...rest] = parts;
  if (!first) return "";

  const firstPart = Array.from(normalizeNameCase(first))
    .slice(0, VISIBLE_FIRST_NAME_LETTERS)
    .join("");

  const last = rest[rest.length - 1];
  if (!last) return firstPart;

  const lastInitial = Array.from(normalizeNameCase(last))[0] ?? "";

  return `${firstPart} ${lastInitial.toUpperCase()}.`;
}
