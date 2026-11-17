// Write an east-north-up matrix onto the frame group immediately.
// EastNorthUpFrame's props are radians (3d-tiles-renderer). The game stores
// degrees. Doing this in the same frame as the position shift keeps the car
// from drawing at the old origin for one frame.

import * as THREE from "three";
import { WGS84_ELLIPSOID } from "3d-tiles-renderer/three";
import type { LatLon } from "./geo";

const DEG = Math.PI / 180;

export function writeEastNorthUp(group: THREE.Object3D, anchor: LatLon): void {
  WGS84_ELLIPSOID.getOrientedEastNorthUpFrame(
    anchor.lat * DEG,
    anchor.lon * DEG,
    0, 0, 0, 0,
    group.matrix,
  );
  group.matrix.decompose(group.position, group.quaternion, group.scale);
  group.updateMatrixWorld(true);
}

export const DEG_TO_RAD = DEG;
