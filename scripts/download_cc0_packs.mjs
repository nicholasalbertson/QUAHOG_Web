#!/usr/bin/env node
/**
 * Download CC0 asset packs that fill downtown / waterfront visual gaps.
 *
 * Sources:
 *   - Kenney (CC0) via signed download-link API
 *   - Poly Haven textures (CC0) via public API
 *
 * Writes into public/vendor/ and a LICENSE + manifest for assets:audit.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { dirname, join, relative } from "path";
import { pipeline } from "stream/promises";
import { createGunzip } from "zlib";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = join(ROOT, "public", "vendor");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Kenney packs that map to South Coast city visual deficiencies. */
const KENNEY_PACKS = [
  "city-kit-commercial",
  "city-kit-suburban",
  "city-kit-roads",
  "city-kit-industrial",
  "nature-kit",
  "car-kit",
  "furniture-kit",
  "train-kit",
  "watercraft-kit",
  "3d-road-tiles",
  "modular-buildings",
  "holiday-kit",
  "graveyard-kit",
  "food-kit",
  "building-kit",
  "brick-kit",
  "castle-kit",
];

/** Poly Haven texture IDs for asphalt / brick / wood / stone / concrete. */
const POLYHAVEN_TEXTURES = [
  "aerial_asphalt_01",
  "asphalt_02",
  "concrete_floor_painted",
  "concrete_floor",
  "brick_floor",
  "brick_wall_02",
  "red_brick_03",
  "worn_planks",
  "wood_floor",
  "rock_face",
  "rocky_terrain",
  "coast_sand_rocks_02",
  "coast_sand_01",
  "coast_land_rocks_01",
  "gravel_floor",
  "metal_plate",
  "corrugated_iron",
  "cobblestone_01",
  "cobblestone_02",
  "cobblestone_04",
  "brick_pavement",
  "brick_crosswalk",
  "clay_roof_tiles",
  "clay_roof_tiles_02",
  "ceramic_roof_01",
  "brown_planks_08",
  "blue_painted_planks",
  "black_painted_planks",
];

function hexId(slug) {
  return Buffer.from(`assets/${slug}`, "utf8").toString("hex");
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function downloadTo(url, dest, referer) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      ...(referer ? { Referer: referer } : {}),
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
  return dest;
}

async function kenneySignedUrl(slug) {
  const page = `https://kenney.nl/assets/${slug}`;
  // Warm page (sets any needed origin state).
  await fetch(page, { headers: { "User-Agent": UA } });
  const id = hexId(slug);
  const data = await fetchJson(`https://kenney.nl/download-link/${id}`, {
    headers: { Referer: page },
  });
  if (!data?.url) throw new Error(`no signed url for ${slug}: ${JSON.stringify(data)}`);
  return { url: data.url, page };
}

function unzip(zipPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  execFileSync("unzip", ["-qo", zipPath, "-d", outDir], { stdio: "inherit" });
}

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

async function downloadKenney() {
  const base = join(VENDOR, "kenney");
  mkdirSync(base, { recursive: true });
  const results = [];
  for (const slug of KENNEY_PACKS) {
    const outDir = join(base, slug);
    const zipPath = join(base, `${slug}.zip`);
    const marker = join(outDir, ".downloaded");
    if (existsSync(marker)) {
      console.log(`[skip] kenney/${slug}`);
      results.push({ slug, skipped: true });
      continue;
    }
    console.log(`[kenney] ${slug}…`);
    try {
      const { url, page } = await kenneySignedUrl(slug);
      await downloadTo(url, zipPath, page);
      unzip(zipPath, outDir);
      writeFileSync(marker, new Date().toISOString());
      const files = walkFiles(outDir).filter((f) => /\.(glb|gltf|fbx|obj|png|jpg|jpeg|webp)$/i.test(f));
      console.log(`  → ${files.length} media files`);
      results.push({ slug, files: files.length, bytes: statSync(zipPath).size });
    } catch (err) {
      console.error(`  FAIL ${slug}: ${err.message}`);
      results.push({ slug, error: String(err.message) });
    }
  }
  return results;
}

async function downloadPolyHaven() {
  const base = join(VENDOR, "polyhaven");
  mkdirSync(base, { recursive: true });
  const results = [];
  for (const id of POLYHAVEN_TEXTURES) {
    const outDir = join(base, id);
    const marker = join(outDir, ".downloaded");
    if (existsSync(marker)) {
      console.log(`[skip] polyhaven/${id}`);
      results.push({ id, skipped: true });
      continue;
    }
    console.log(`[polyhaven] ${id}…`);
    try {
      const files = await fetchJson(`https://api.polyhaven.com/files/${id}`);
      // Prefer 1k or 2k diffuse/albedo + normal + rough for web.
      const maps = [];
      for (const mapName of ["Diffuse", "diff", "albedo", "nor_gl", "Rough", "AO", "arm"]) {
        const entry = files[mapName] || files[mapName.toLowerCase()];
        if (!entry) continue;
        // Structure: { "1k": { "jpg": { url } }, "2k": ... }
        const res = entry["1k"] || entry["2k"] || entry["4k"];
        if (!res) continue;
        const fmt = res.jpg || res.png || res.exr;
        if (!fmt?.url) continue;
        maps.push({ mapName, url: fmt.url, ext: fmt.url.split(".").pop() });
      }
      // Fallback: walk all keys for 1k jpg
      if (maps.length === 0) {
        for (const [mapName, resolutions] of Object.entries(files)) {
          if (typeof resolutions !== "object" || !resolutions) continue;
          const r1 = resolutions["1k"] || resolutions["2k"];
          if (!r1) continue;
          const fmt = r1.jpg || r1.png;
          if (fmt?.url) maps.push({ mapName, url: fmt.url, ext: fmt.url.split(".").pop() });
        }
      }
      mkdirSync(outDir, { recursive: true });
      let n = 0;
      for (const m of maps.slice(0, 6)) {
        const dest = join(outDir, `${id}_${m.mapName}.${m.ext}`);
        await downloadTo(m.url, dest);
        n++;
      }
      writeFileSync(marker, new Date().toISOString());
      console.log(`  → ${n} maps`);
      results.push({ id, maps: n });
    } catch (err) {
      console.error(`  FAIL ${id}: ${err.message}`);
      results.push({ id, error: String(err.message) });
    }
  }
  return results;
}

function writeManifest(kenney, polyhaven) {
  const kenneyFiles = walkFiles(join(VENDOR, "kenney")).filter((f) =>
    /\.(glb|gltf|fbx|obj|png|jpg|jpeg|webp)$/i.test(f),
  );
  const phFiles = walkFiles(join(VENDOR, "polyhaven")).filter((f) =>
    /\.(png|jpg|jpeg|webp|exr)$/i.test(f),
  );
  const manifest = {
    kind: "cc0-vendor-packs",
    updatedAt: new Date().toISOString().slice(0, 10),
    kenney: {
      license: "CC0-1.0",
      attribution: "Kenney.nl — CC0",
      packs: kenney,
      fileCount: kenneyFiles.length,
    },
    polyhaven: {
      license: "CC0-1.0",
      attribution: "Poly Haven — CC0",
      textures: polyhaven,
      fileCount: phFiles.length,
    },
  };
  writeFileSync(join(VENDOR, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(
    join(VENDOR, "LICENSE.txt"),
    [
      "Vendor CC0 packs for QUAHOG_Web visual fill.",
      "",
      "Kenney Game Assets — Creative Commons CC0 1.0",
      "  https://kenney.nl  https://creativecommons.org/publicdomain/zero/1.0/",
      "",
      "Poly Haven textures — Creative Commons CC0 1.0",
      "  https://polyhaven.com  https://creativecommons.org/publicdomain/zero/1.0/",
      "",
      "No attribution required; credit retained in assets-licenses.json.",
      "",
    ].join("\n"),
  );
  return manifest;
}

const kenney = await downloadKenney();
const polyhaven = await downloadPolyHaven();
const manifest = writeManifest(kenney, polyhaven);
console.log(JSON.stringify({ kenneyOk: kenney.filter((x) => !x.error).length, polyOk: polyhaven.filter((x) => !x.error).length, files: manifest.kenney.fileCount + manifest.polyhaven.fileCount }, null, 2));
