const LETTERS_AND_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSuffix(length: number) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * LETTERS_AND_DIGITS.length);
    out += LETTERS_AND_DIGITS[index];
  }
  return out;
}

export function generateVendorCode() {
  return `S${randomSuffix(5)}`;
}
