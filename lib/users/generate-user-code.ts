const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function userCodePrefixForName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return "US";

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0]?.[0] ?? "U";
    const second = words[1]?.[0] ?? "S";
    return `${first}${second}`.toUpperCase().replace(/[^A-Z]/g, "U");
  }

  const compact = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.slice(0, 2).padEnd(2, "U").replace(/[^A-Z]/g, "U");
}

export function randomUserCodeSuffix() {
  let value = "";
  for (let index = 0; index < 4; index += 1) {
    value += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)] ?? "0";
  }
  return value;
}

export function generateUserCode(fullName: string) {
  return `${userCodePrefixForName(fullName)}${randomUserCodeSuffix()}`;
}
