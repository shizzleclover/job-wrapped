// Copies the built zip onto the website so /install can serve it. Run after `npm run zip`.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const { version } = JSON.parse(readFileSync(`${root}package.json`, "utf8"));
const zip = `${root}.output/job-hunt-wrapped-extension-${version}-chrome.zip`;
if (!existsSync(zip)) throw new Error(`No zip at ${zip}. Run \`npm run zip\` first.`);

const web = fileURLToPath(new URL("../../web/", import.meta.url));
mkdirSync(`${web}public/downloads`, { recursive: true });
copyFileSync(zip, `${web}public/downloads/job-hunt-wrapped.zip`);
writeFileSync(
  `${web}lib/release.json`,
  JSON.stringify({ version, bytes: statSync(zip).size, released: new Date().toISOString().slice(0, 10) }, null, 2) + "\n"
);
console.log(`release: copied v${version} to web/public/downloads/job-hunt-wrapped.zip`);
