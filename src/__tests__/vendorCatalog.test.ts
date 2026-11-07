import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KENNEY, PACK011, POLYHAVEN, STREET_TREE_POOL } from "../world/vendorCatalog";

const root = join(process.cwd(), "public");

function onDisk(urlPath: string) {
  return existsSync(join(root, urlPath.replace(/^\//, "")));
}

describe("vendorCatalog — CC0 packs on disk", () => {
  it("resolves every pack011 template", () => {
    for (const path of Object.values(PACK011)) {
      expect(onDisk(path), path).toBe(true);
    }
  });

  it("resolves curated Kenney templates", () => {
    for (const path of Object.values(KENNEY)) {
      expect(onDisk(path), path).toBe(true);
    }
  });

  it("resolves Poly Haven maps used by vendorTextures", () => {
    for (const path of Object.values(POLYHAVEN)) {
      expect(onDisk(path), path).toBe(true);
    }
  });

  it("street tree pool is non-empty and present", () => {
    expect(STREET_TREE_POOL.length).toBeGreaterThan(3);
    for (const path of STREET_TREE_POOL) {
      expect(onDisk(path), path).toBe(true);
    }
  });
});
