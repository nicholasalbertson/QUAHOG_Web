#!/usr/bin/env node
/**
 * §0.3 — fail if Math.random appears under src/sim (determinism gate).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../src/sim", import.meta.url).pathname;
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      const text = readFileSync(p, "utf8");
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        if (trimmed.includes("Math.random")) hits.push(`${p}:${i + 1}: ${trimmed}`);
      });
    }
  }
}

walk(root);
if (hits.length) {
  console.error("§0.3 Math.random still present in src/sim:\n" + hits.join("\n"));
  process.exit(1);
}
console.log("§0.3 ok — no Math.random in src/sim");
