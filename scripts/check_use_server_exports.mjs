import fs from "fs";
import path from "path";

const APP_DIR = path.join(process.cwd(), "app");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name === "actions.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

function isUseServerFile(source) {
  const firstStatement = source.match(/^\s*(['"])use server\1;/m);
  return Boolean(firstStatement);
}

function findForbiddenExports(source) {
  const failures = [];
  const lines = source.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("export ")) {
      continue;
    }

    if (
      trimmed.startsWith("export async function ") ||
      trimmed.startsWith("export type ") ||
      trimmed.startsWith("export interface ")
    ) {
      continue;
    }

    failures.push({
      line: index + 1,
      exportLine: trimmed,
    });
  }

  return failures;
}

function main() {
  const actionFiles = walk(APP_DIR);
  const failures = [];

  for (const file of actionFiles) {
    const source = fs.readFileSync(file, "utf8");
    if (!isUseServerFile(source)) {
      continue;
    }

    const fileFailures = findForbiddenExports(source);
    for (const failure of fileFailures) {
      failures.push({
        file: path.relative(process.cwd(), file),
        ...failure,
      });
    }
  }

  if (failures.length > 0) {
    console.error("Invalid exports found in \"use server\" files:");
    for (const failure of failures) {
      console.error(`- ${failure.file}:${failure.line} ${failure.exportLine}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${actionFiles.length} actions.ts files: use server exports are clean.`);
}

main();
