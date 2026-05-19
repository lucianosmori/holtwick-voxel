import * as THREE from "three";

// Builds a multi-part voxel-style character (head/torso/arms/legs) so entities
// read as "people" rather than single cubes / flat billboards. The result is a
// Group; treat its `position` as the character's foot-anchored world position
// (matches Player.mesh.position semantics where y = foot + half).

export interface CharacterPalette {
  skin: string;
  hair: string;
  body: string;       // shirt / robe primary
  bodyAccent: string; // pants / robe darker
  trim: string;       // belt / accent
  eyes: string;
}

export interface CharacterMesh {
  group: THREE.Group;
  // Call each frame; advances limb swing when isMoving, dampens to rest otherwise.
  animate: (dt: number, isMoving: boolean) => void;
  dispose: () => void;
}

// Shared head geometry — slightly rounded (segmented box approximation via
// SphereGeometry low-res for performance, or BoxGeometry with bevel feel).
// We use a low-poly icosahedron for a faceted "voxel-ish" head that still
// reads as round vs a hard cube.
const SHARED_HEAD_GEOM = new THREE.IcosahedronGeometry(0.18, 0);
const SHARED_TORSO_GEOM = new THREE.BoxGeometry(0.36, 0.42, 0.22);
const SHARED_LIMB_GEOM = new THREE.BoxGeometry(0.11, 0.34, 0.11);
const SHARED_LEG_GEOM = new THREE.BoxGeometry(0.13, 0.36, 0.13);
const SHARED_EYE_GEOM = new THREE.BoxGeometry(0.04, 0.04, 0.02);
const SHARED_HAIR_GEOM = new THREE.BoxGeometry(0.38, 0.12, 0.38);

// Target total visual height ~1.0 (matches PLAYER_SIZE=0.6 footprint + a bit
// of head/legs sticking above). For NPCs scaled later via group.scale to fit
// NPC_HEIGHT=1.5 plane footprint.
const CHARACTER_VISUAL_HEIGHT = 1.0;
export const CHARACTER_HEIGHT = CHARACTER_VISUAL_HEIGHT;

interface PartRefs {
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  torso: THREE.Mesh;
  head: THREE.Mesh;
}

export function buildCharacterMesh(palette: CharacterPalette): CharacterMesh {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.85 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: palette.body, roughness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: palette.bodyAccent, roughness: 0.75 });
  const hairMat = new THREE.MeshStandardMaterial({ color: palette.hair, roughness: 0.9 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: palette.eyes });
  const trimMat = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.6, metalness: 0.2 });

  // Anchor: group.position is the foot center. Build everything above y=0.
  // Legs root pivots at the top of leg for swinging.
  const torso = new THREE.Mesh(SHARED_TORSO_GEOM, bodyMat);
  torso.position.y = 0.36 + 0.21; // top of legs + half torso
  torso.castShadow = true;
  group.add(torso);

  // Belt / trim band
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.24), trimMat);
  belt.position.y = 0.36 + 0.02;
  group.add(belt);

  // Head — icosahedron for rounded silhouette
  const head = new THREE.Mesh(SHARED_HEAD_GEOM, skinMat);
  head.position.y = 0.36 + 0.42 + 0.18; // top of torso + radius
  head.castShadow = true;
  group.add(head);

  // Hair cap
  const hair = new THREE.Mesh(SHARED_HAIR_GEOM, hairMat);
  hair.scale.set(0.5, 0.5, 0.5);
  hair.position.y = head.position.y + 0.12;
  group.add(hair);

  // Eyes — small dark boxes on front face (-z forward by default)
  const leftEye = new THREE.Mesh(SHARED_EYE_GEOM, eyeMat);
  leftEye.position.set(-0.06, head.position.y + 0.01, -0.16);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(SHARED_EYE_GEOM, eyeMat);
  rightEye.position.set(0.06, head.position.y + 0.01, -0.16);
  group.add(rightEye);

  // Arms — pivot from shoulder. Use small parent groups so rotation pivots at shoulder, not arm center.
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.23, 0.36 + 0.38, 0);
  const leftArm = new THREE.Mesh(SHARED_LIMB_GEOM, bodyMat);
  leftArm.position.y = -0.17;
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);
  group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.23, 0.36 + 0.38, 0);
  const rightArm = new THREE.Mesh(SHARED_LIMB_GEOM, bodyMat);
  rightArm.position.y = -0.17;
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);
  group.add(rightArmPivot);

  // Legs — pivot from hip
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.08, 0.36, 0);
  const leftLeg = new THREE.Mesh(SHARED_LEG_GEOM, accentMat);
  leftLeg.position.y = -0.18;
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);
  group.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.08, 0.36, 0);
  const rightLeg = new THREE.Mesh(SHARED_LEG_GEOM, accentMat);
  rightLeg.position.y = -0.18;
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);
  group.add(rightLegPivot);

  // Animation state — phase advances when moving, eases back when idle.
  let walkPhase = 0;
  let swingAmp = 0; // 0..1, lerps to 1 when moving, 0 when idle

  const refs: PartRefs = {
    leftArm: leftArmPivot as unknown as THREE.Mesh,
    rightArm: rightArmPivot as unknown as THREE.Mesh,
    leftLeg: leftLegPivot as unknown as THREE.Mesh,
    rightLeg: rightLegPivot as unknown as THREE.Mesh,
    torso,
    head,
  };

  const animate = (dt: number, isMoving: boolean) => {
    const targetAmp = isMoving ? 1 : 0;
    swingAmp += (targetAmp - swingAmp) * Math.min(1, dt * 8);
    if (isMoving) walkPhase += dt * 8; // ~8 rad/s = brisk walk
    const a = Math.sin(walkPhase) * 0.6 * swingAmp;
    refs.leftLeg.rotation.x = a;
    refs.rightLeg.rotation.x = -a;
    refs.leftArm.rotation.x = -a * 0.7;
    refs.rightArm.rotation.x = a * 0.7;
    // Body bob
    const bob = Math.abs(Math.sin(walkPhase)) * 0.025 * swingAmp;
    refs.torso.position.y = (0.36 + 0.21) + bob;
    refs.head.position.y = (0.36 + 0.42 + 0.18) + bob;
  };

  const dispose = () => {
    skinMat.dispose();
    bodyMat.dispose();
    accentMat.dispose();
    hairMat.dispose();
    eyeMat.dispose();
    trimMat.dispose();
  };

  return { group, animate, dispose };
}
