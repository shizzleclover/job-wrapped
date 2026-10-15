// Copies the shared schema and fallback copy from the extension, the canonical source.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const from = fileURLToPath(new URL("../../extension/shared/", import.meta.url));
const to = fileURLToPath(new URL("../lib/wrapped/", import.meta.url));

if (!existsSync(from)) {
  console.log("sync-shared: ../extension/shared not found, keeping committed copies.");
  process.exit(0);
}
for (const file of ["schema.ts", "fallback.ts", "share.ts"]) {
  const body = readFileSync(from + file, "utf8").replace(/^\/\/ Canonical copy\..*\n/, "");
  writeFileSync(to + file, `// GENERATED from extension/shared/${file} by \`npm run sync-shared\`. Edit that file instead.\n${body}`);
}
console.log("sync-shared: copied schema.ts, fallback.ts and share.ts");
