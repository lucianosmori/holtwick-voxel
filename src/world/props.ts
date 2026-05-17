import * as THREE from "three";
import {
  VOXEL_EMPTY,
  VOXEL_FLOOR,
  type VoxelGrid,
} from "./voxel";
import {
  BLACKSMITH_FOOTPRINT,
  DEFAULT_BUILDINGS,
  STALL_DEPTH,
  STALL_WIDTH,
  WELL_RADIUS,
} from "./buildings";
import {
  TAVERN_INTERIOR_DEPTH,
  TAVERN_INTERIOR_WIDTH,
} from "./tavern";
import {
  TAVERN_ORIGIN_X,
  TAVERN_ORIGIN_Z,
} from "./village";
import planksUrl from "../../assets/voxel/PNG/Orange/texture_04.png?url";
import dirtUrl from "../../assets/voxel/PNG/Dark/texture_05.png?url";

export type PropType = "barrel" | "crate";

export interface PropPlacement {
  readonly cellX: number;
  readonly cellZ: number;
  readonly type: PropType;
}

export const PROP_COUNT_DEFAULT = 20;

interface Zone {
  readonly label: string;
  /** Inclusive footprint bounds — props are placed on a 1-cell ring outside. */
  readonly minX: number;
  readonly maxX: number; // inclusive
  readonly minZ: number;
  readonly maxZ: number; // inclusive
  readonly target: number;
}

const TAVERN_FOOTPRINT_W = TAVERN_INTERIOR_WIDTH + 2;
const TAVERN_FOOTPRINT_D = TAVERN_INTERIOR_DEPTH + 2;

function buildZones(): Zone[] {
  const t = {
    minX: TAVERN_ORIGIN_X,
    maxX: TAVERN_ORIGIN_X + TAVERN_FOOTPRINT_W - 1,
    minZ: TAVERN_ORIGIN_Z,
    maxZ: TAVERN_ORIGIN_Z + TAVERN_FOOTPRINT_D - 1,
  };
  const b = DEFAULT_BUILDINGS.blacksmith;
  const w = DEFAULT_BUILDINGS.well;
  const s0 = DEFAULT_BUILDINGS.stalls[0];
  const s1 = DEFAULT_BUILDINGS.stalls[1];
  return [
    // Tavern + blacksmith get a heavier dressing — bigger footprint, more
    // candidate cells in the ring. Well gets a smaller cluster (single-cell
    // structure). Stalls share a row so they get fewer each.
    { label: "tavern", target: 6, ...t },
    {
      label: "blacksmith",
      target: 6,
      minX: b.originX,
      maxX: b.originX + BLACKSMITH_FOOTPRINT - 1,
      minZ: b.originZ,
      maxZ: b.originZ + BLACKSMITH_FOOTPRINT - 1,
    },
    {
      label: "well",
      target: 4,
      minX: w.centerX - WELL_RADIUS,
      maxX: w.centerX + WELL_RADIUS,
      minZ: w.centerZ - WELL_RADIUS,
      maxZ: w.centerZ + WELL_RADIUS,
    },
    {
      label: "stall-0",
      target: 2,
      minX: s0.originX,
      maxX: s0.originX + STALL_WIDTH - 1,
      minZ: s0.originZ,
      maxZ: s0.originZ + STALL_DEPTH - 1,
    },
    {
      label: "stall-1",
      target: 2,
      minX: s1.originX,
      maxX: s1.originX + STALL_WIDTH - 1,
      minZ: s1.originZ,
      maxZ: s1.originZ + STALL_DEPTH - 1,
    },
  ];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

function ringCells(zone: Zone): Array<{ x: number; z: number }> {
  const cells: Array<{ x: number; z: number }> = [];
  const x0 = zone.minX - 1;
  const x1 = zone.maxX + 1;
  const z0 = zone.minZ - 1;
  const z1 = zone.maxZ + 1;
  for (let x = x0; x <= x1; x++) {
    cells.push({ x, z: z0 });
    cells.push({ x, z: z1 });
  }
  for (let z = z0 + 1; z <= z1 - 1; z++) {
    cells.push({ x: x0, z });
    cells.push({ x: x1, z });
  }
  return cells;
}

// Deterministic decorative-prop placement on the 1-cell ring around each of
// the 5 building footprints (tavern, blacksmith, well, 2 stalls). A cell is
// accepted when:
//   - in bounds AND grass (VOXEL_FLOOR) at y=0 — skips roads (dirt), plaza
//     (stone), pond (water), and any building interior (planks).
//   - column y≥1 is fully empty — skips wall voxels, foliage, and the well
//     ring stones above ground.
//   - not already claimed by a prior prop or reserved cell (NPCs, items).
// Per-zone target adds up to PROP_COUNT_DEFAULT (20); a zone falls short
// silently if its ring has fewer surviving candidates than its target.
export function computeProps(
  seed: number,
  grid: VoxelGrid,
  reservedCells: ReadonlyArray<{ cellX: number; cellZ: number }> = [],
  count: number = PROP_COUNT_DEFAULT,
): PropPlacement[] {
  const rand = mulberry32((seed ^ 0xb022) >>> 0);
  const used = new Set<string>();
  for (const r of reservedCells) used.add(`${r.cellX},${r.cellZ}`);

  const props: PropPlacement[] = [];
  const zones = buildZones();
  const totalTarget = zones.reduce((n, z) => n + z.target, 0);
  const remaining = Math.min(count, totalTarget);

  for (const zone of zones) {
    if (props.length >= remaining) break;
    const candidates = ringCells(zone).filter((c) => {
      const key = `${c.x},${c.z}`;
      if (used.has(key)) return false;
      if (!grid.inBounds(c.x, 0, c.z)) return false;
      if (grid.get(c.x, 0, c.z) !== VOXEL_FLOOR) return false;
      for (let y = 1; y < grid.dims.height; y++) {
        if (grid.get(c.x, y, c.z) !== VOXEL_EMPTY) return false;
      }
      return true;
    });
    shuffle(candidates, rand);
    const take = Math.min(zone.target, candidates.length, remaining - props.length);
    for (let i = 0; i < take; i++) {
      const c = candidates[i];
      used.add(`${c.x},${c.z}`);
      const type: PropType = rand() < 0.5 ? "barrel" : "crate";
      props.push({ cellX: c.x, cellZ: c.z, type });
    }
  }
  return props;
}

const SHARED_BOX = new THREE.BoxGeometry(1, 1, 1);
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function loadTex(url: string): THREE.Texture {
  const cached = textureCache.get(url);
  if (cached) return cached;
  const tex = textureLoader.load(url);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(url, tex);
  return tex;
}

const BARREL_SCALE_X = 0.6;
const BARREL_SCALE_Y = 0.9;
const BARREL_SCALE_Z = 0.6;
const CRATE_SCALE = 0.7;

// Builds two InstancedMeshes (barrels + crates) keyed by prop.type. Both sit
// on top of the y=0 ground tile centred at world y = 1 + half-height. Caller
// positions the returned group with the same gridOffset as the voxel mesh so
// cells align with the voxel grid one-for-one.
export function buildPropMesh(props: ReadonlyArray<PropPlacement>): THREE.Group {
  const group = new THREE.Group();
  group.name = "props";
  if (props.length === 0) return group;

  const barrels = props.filter((p) => p.type === "barrel");
  const crates = props.filter((p) => p.type === "crate");

  // Barrels use the darker dirt texture (reads as banded wood staves) for
  // visual contrast against the bright plank crates — keeps both prop types
  // distinguishable in screenshots even at small minimap scales.
  const barrelMat = new THREE.MeshStandardMaterial({
    map: loadTex(dirtUrl),
    roughness: 0.85,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    map: loadTex(planksUrl),
    roughness: 0.85,
  });

  const matrix = new THREE.Matrix4();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  if (barrels.length > 0) {
    const mesh = new THREE.InstancedMesh(SHARED_BOX, barrelMat, barrels.length);
    mesh.name = "props:barrel";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scale.set(BARREL_SCALE_X, BARREL_SCALE_Y, BARREL_SCALE_Z);
    for (let i = 0; i < barrels.length; i++) {
      const p = barrels[i];
      pos.set(p.cellX + 0.5, 1 + BARREL_SCALE_Y / 2, p.cellZ + 0.5);
      matrix.compose(pos, quat, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  if (crates.length > 0) {
    const mesh = new THREE.InstancedMesh(SHARED_BOX, crateMat, crates.length);
    mesh.name = "props:crate";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scale.set(CRATE_SCALE, CRATE_SCALE, CRATE_SCALE);
    for (let i = 0; i < crates.length; i++) {
      const p = crates[i];
      pos.set(p.cellX + 0.5, 1 + CRATE_SCALE / 2, p.cellZ + 0.5);
      matrix.compose(pos, quat, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  return group;
}
