import { z } from "zod";

/** Single-address check (aligned with Zod’s built-in email format). */
const zodEmail = z.string().email();

export function isValidEmailAddress(value: string): boolean {
  return zodEmail.safeParse(value).success;
}

/**
 * Trim, lowercase, and strip trailing punctuation often pasted after addresses
 * (e.g. `buyer@co.com,` or `BUYER@CO.COM.`).
 */
export function normalizeEmailToken(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/[.,;:!?]+$/, "");
  return s.trim();
}

/**
 * Parse multi-line / comma / semicolon separated email lists into unique
 * normalized entries.
 */
export function parseEmailList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const t = normalizeEmailToken(part);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Validate a textarea-style field (comma/newline separated). `minCount` 0 = field may be empty.
 */
export function getEmailListValidationIssues(
  raw: string,
  opts: { minCount: number; fieldLabel: string }
): string[] {
  const issues: string[] = [];
  const list = parseEmailList(raw);
  if (opts.minCount > 0 && list.length === 0) {
    issues.push(`At least one valid ${opts.fieldLabel} is required`);
  }
  for (const e of list) {
    if (!isValidEmailAddress(e)) {
      issues.push(`Invalid email (${opts.fieldLabel}): ${e}`);
    }
  }
  return issues;
}

export function stringifyEmailList(emails: string[] | null | undefined): string {
  if (!emails?.length) return "";
  return emails.join("\n");
}
