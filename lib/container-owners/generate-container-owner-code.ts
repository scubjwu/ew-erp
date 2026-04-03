const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateContainerOwnerCode() {
  let suffix = "";
  for (let index = 0; index < 5; index += 1) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)] ?? "A";
  }
  return `O${suffix}`;
}
