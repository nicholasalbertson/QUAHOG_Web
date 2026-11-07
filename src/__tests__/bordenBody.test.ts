import { describe, expect, it } from "vitest";
import {
  CHARACTER_MODELS,
  registryModelById,
  usePrimitiveBody,
} from "../assets/modelRegistry";

describe("bordenBody", () => {
  it("keeps Borden menu previews while forcing procedural in-world bodies", () => {
    const lizzie = registryModelById("lizzie");
    const remington = registryModelById("remington-borden");
    expect(lizzie?.preview).toBe("/models/previews/lizzie_preview.png");
    expect(remington?.preview).toBe("/models/previews/remington_borden_preview.png");
    expect(lizzie?.usePrimitiveBody).toBe(true);
    expect(remington?.usePrimitiveBody).toBe(true);
    expect(usePrimitiveBody("lizzie")).toBe(true);
    expect(usePrimitiveBody("remington-borden")).toBe(true);
  });

  it("leaves Franklin on the authored GLB path", () => {
    expect(usePrimitiveBody("franklin")).toBe(false);
    expect(registryModelById("franklin")?.url).toBe("/models/franklin_animated.glb");
  });

  it("exposes the full cast in CHARACTER_MODELS for the menu", () => {
    const ids = CHARACTER_MODELS.map((m) => m.id);
    expect(ids).toContain("franklin");
    expect(ids).toContain("lizzie");
    expect(ids).toContain("remington-borden");
  });
});
