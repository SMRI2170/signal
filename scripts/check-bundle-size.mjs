import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "out";
const MAX_TOTAL_JS = 3 * 1024 * 1024;
const MAX_SINGLE_JS = 750 * 1024;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

const jsFiles = (await walk(ROOT)).filter((file) => file.endsWith(".js"));
const sizes = await Promise.all(jsFiles.map(async (file) => ({ file, size: (await stat(file)).size })));
const total = sizes.reduce((sum, item) => sum + item.size, 0);
const largest = sizes.sort((a, b) => b.size - a.size)[0] ?? { file: "none", size: 0 };

console.log(`JavaScript bundle: ${(total / 1024).toFixed(1)} KiB total; largest ${(largest.size / 1024).toFixed(1)} KiB (${largest.file})`);

if (total > MAX_TOTAL_JS || largest.size > MAX_SINGLE_JS) {
  console.error("Bundle size budget exceeded. Review newly added dependencies or split large client-side code.");
  process.exit(1);
}
