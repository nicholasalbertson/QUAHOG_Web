#!/usr/bin/env node
/**
 * Fetch the licensed packs listed in src/content/licensedPacks.json.
 * Large binaries land in public/vendor/cc0/files/ and are gitignored.
 * Re-run is safe: a file already on disk is left alone.
 *
 *   npm run assets:fetch-licensed
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "vendor", "cc0", "files");
const catalog = JSON.parse(readFileSync(join(ROOT, "src", "content", "licensedPacks.json"), "utf8"));

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
  return statSync(dest).size;
}

let failed = 0;
for (const pack of catalog.packs) {
  if (!pack.download) {
    console.log(`skip ${pack.id} (already in the repo)`);
    continue;
  }
  const dest = join(OUT, pack.dest);
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`have ${pack.id} (${statSync(dest).size} bytes)`);
    continue;
  }
  try {
    const bytes = await download(pack.download, dest);
    console.log(`got ${pack.id} → ${pack.dest} (${bytes} bytes)`);
  } catch (error) {
    failed += 1;
    console.error(`fail ${pack.id}: ${error.message}`);
  }
}
if (failed) process.exitCode = 1;
