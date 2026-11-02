import * as THREE from "three";

export const JOINTS = {
  Hips: 0,
  Spine: 1,
  Spine1: 2,
  Spine2: 3,
  Neck: 4,
  Head: 5,
  LeftShoulder: 9,
  LeftArm: 10,
  LeftForeArm: 11,
  LeftHand: 12,
  RightShoulder: 33,
  RightArm: 34,
  RightForeArm: 35,
  RightHand: 36,
  LeftUpLeg: 57,
  LeftLeg: 58,
  LeftFoot: 59,
  LeftToeBase: 60,
  RightUpLeg: 62,
  RightLeg: 63,
  RightFoot: 64,
  RightToeBase: 65,
};

function attachSkinning(geometry, skinningFn) {
  const pos = geometry.attributes.position;
  const skinIndices = [];
  const skinWeights = [];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const { indices, weights } = skinningFn(x, y, z, i);

    const sum = weights.reduce((a, b) => a + b, 0) || 1.0;
    skinIndices.push(indices[0] || 0, indices[1] || 0, indices[2] || 0, indices[3] || 0);
    skinWeights.push(weights[0] / sum, (weights[1] || 0) / sum, (weights[2] || 0) / sum, (weights[3] || 0) / sum);
  }

  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.computeVertexNormals();
  return geometry;
}

// Complete underlying human body geometry
export function createAnatomicalBodyGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  // 1. Torso & Neck Column (Neck Y=1.45 down to Pelvis Y=0.86)
  const torsoRings = [
    { y: 1.45, rx: 0.052, rz: 0.055, zc: 0.005 }, // Base of neck (connecting to Wolf3D_Head)
    { y: 1.41, rx: 0.065, rz: 0.062, zc: 0.008 }, // Lower neck / suprasternal notch
    { y: 1.38, rx: 0.118, rz: 0.076, zc: 0.012 }, // Clavicles & inner shoulders
    { y: 1.34, rx: 0.138, rz: 0.088, zc: 0.016 }, // Upper chest (visible in V-neck plunge)
    { y: 1.28, rx: 0.142, rz: 0.092, zc: 0.020 }, // Mid chest / bust line
    { y: 1.22, rx: 0.136, rz: 0.086, zc: 0.024 }, // Lower ribcage
    { y: 1.15, rx: 0.128, rz: 0.080, zc: 0.026 }, // High waist
    { y: 1.08, rx: 0.126, rz: 0.078, zc: 0.028 }, // Natural waist
    { y: 1.02, rx: 0.138, rz: 0.086, zc: 0.030 }, // High hip / iliac crest
    { y: 0.95, rx: 0.155, rz: 0.098, zc: 0.032 }, // Mid pelvis
    { y: 0.88, rx: 0.160, rz: 0.104, zc: 0.034 }, // Lower pelvis / hip joints
  ];

  const tSlices = 24;
  const tStarts = [];

  for (let r = 0; r < torsoRings.length; r++) {
    const ring = torsoRings[r];
    const start = positions.length / 3;
    for (let s = 0; s <= tSlices; s++) {
      const theta = (s / tSlices) * Math.PI * 2;
      const px = Math.sin(theta) * ring.rx;
      const py = ring.y;
      const pz = ring.zc + Math.cos(theta) * ring.rz;
      positions.push(px, py, pz);
      uvs.push(s / tSlices, r / (torsoRings.length - 1));
    }
    tStarts.push(start);
  }

  for (let r = 0; r < torsoRings.length - 1; r++) {
    const cur = tStarts[r];
    const next = tStarts[r + 1];
    for (let s = 0; s < tSlices; s++) {
      indices.push(cur + s, next + s, cur + s + 1);
      indices.push(cur + s + 1, next + s, next + s + 1);
    }
  }

  // 2. Anatomical Arms (from shoulder down to wrist connecting to hands)
  function createArm(isLeft) {
    const sign = isLeft ? 1 : -1;
    const armRings = [
      { y: 1.38, x: sign * 0.145, z: -0.010, r: 0.046 }, // Shoulder joint
      { y: 1.32, x: sign * 0.195, z: -0.015, r: 0.042 }, // Upper bicep
      { y: 1.25, x: sign * 0.245, z: -0.018, r: 0.038 }, // Lower bicep
      { y: 1.18, x: sign * 0.290, z: 0.005,  r: 0.035 }, // Elbow
      { y: 1.11, x: sign * 0.335, z: 0.035,  r: 0.032 }, // Forearm
      { y: 1.05, x: sign * 0.370, z: 0.060,  r: 0.028 }, // Wrist (meets Wolf3D_Body hands at Y=1.05)
    ];

    const aSlices = 14;
    const aStarts = [];

    for (let r = 0; r < armRings.length; r++) {
      const ring = armRings[r];
      const start = positions.length / 3;
      for (let s = 0; s <= aSlices; s++) {
        const phi = (s / aSlices) * Math.PI * 2;
        const px = ring.x + Math.cos(phi) * ring.r * 0.88;
        const py = ring.y + Math.sin(phi) * ring.r * 0.72;
        const pz = ring.z + Math.sin(phi) * ring.r;
        positions.push(px, py, pz);
        uvs.push(s / aSlices, r / (armRings.length - 1));
      }
      aStarts.push(start);
    }

    for (let r = 0; r < armRings.length - 1; r++) {
      const cur = aStarts[r];
      const next = aStarts[r + 1];
      for (let s = 0; s < aSlices; s++) {
        indices.push(cur + s, isLeft ? next + s : cur + s + 1, isLeft ? cur + s + 1 : next + s);
        indices.push(cur + s + 1, isLeft ? next + s : next + s + 1, isLeft ? next + s + 1 : next + s);
      }
    }
  }

  createArm(true);  // Left arm
  createArm(false); // Right arm

  // 3. Anatomical Legs (Thigh, Knee, Calf down to ankle Y=0.12)
  function createLeg(isLeft) {
    const sign = isLeft ? 1 : -1;
    const legX = sign * 0.092;

    const legRings = [
      { y: 0.86, rx: 0.076, rz: 0.078, zc: 0.030 }, // Inseam / upper thigh
      { y: 0.76, rx: 0.070, rz: 0.072, zc: 0.024 }, // Mid thigh
      { y: 0.65, rx: 0.064, rz: 0.066, zc: 0.018 }, // Lower thigh
      { y: 0.52, rx: 0.056, rz: 0.058, zc: 0.012 }, // Knee
      { y: 0.40, rx: 0.054, rz: 0.056, zc: 0.010 }, // Upper calf
      { y: 0.28, rx: 0.050, rz: 0.052, zc: 0.008 }, // Mid calf
      { y: 0.16, rx: 0.044, rz: 0.046, zc: 0.006 }, // Lower calf
      { y: 0.10, rx: 0.040, rz: 0.042, zc: 0.005 }, // Ankle
    ];

    const lSlices = 16;
    const lStarts = [];

    for (let r = 0; r < legRings.length; r++) {
      const ring = legRings[r];
      const start = positions.length / 3;
      for (let s = 0; s <= lSlices; s++) {
        const theta = (s / lSlices) * Math.PI * 2;
        const px = legX + Math.sin(theta) * ring.rx;
        const py = ring.y;
        const pz = ring.zc + Math.cos(theta) * ring.rz;
        positions.push(px, py, pz);
        uvs.push(s / lSlices, r / (legRings.length - 1));
      }
      lStarts.push(start);
    }

    for (let r = 0; r < legRings.length - 1; r++) {
      const cur = lStarts[r];
      const next = lStarts[r + 1];
      for (let s = 0; s < lSlices; s++) {
        indices.push(cur + s, isLeft ? next + s : cur + s + 1, isLeft ? cur + s + 1 : next + s);
        indices.push(cur + s + 1, isLeft ? next + s : next + s + 1, isLeft ? next + s + 1 : next + s);
      }
    }
  }

  createLeg(true);  // Left leg
  createLeg(false); // Right leg

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  return attachSkinning(geom, (x, y, z) => {
    // Arm skinning
    if (Math.abs(x) > 0.14 && y > 1.02) {
      const isLeft = x > 0;
      const sh = isLeft ? JOINTS.LeftShoulder : JOINTS.RightShoulder;
      const arm = isLeft ? JOINTS.LeftArm : JOINTS.RightArm;
      const fa = isLeft ? JOINTS.LeftForeArm : JOINTS.RightForeArm;

      if (y > 1.30) {
        const t = (y - 1.30) / (1.42 - 1.30);
        return { indices: [sh, arm, 0, 0], weights: [t, 1 - t, 0, 0] };
      } else if (y > 1.15) {
        const t = (y - 1.15) / (1.30 - 1.15);
        return { indices: [arm, fa, 0, 0], weights: [t, 1 - t, 0, 0] };
      } else {
        return { indices: [fa, 0, 0, 0], weights: [1.0, 0, 0, 0] };
      }
    }

    // Legs skinning
    if (y < 0.86) {
      const isLeft = x >= 0;
      const upLeg = isLeft ? JOINTS.LeftUpLeg : JOINTS.RightUpLeg;
      const leg = isLeft ? JOINTS.LeftLeg : JOINTS.RightLeg;
      const foot = isLeft ? JOINTS.LeftFoot : JOINTS.RightFoot;

      if (y > 0.52) {
        const t = (y - 0.52) / (0.86 - 0.52);
        return { indices: [upLeg, leg, 0, 0], weights: [0.4 + 0.6 * t, (1.0 - t) * 0.6, 0, 0] };
      } else if (y > 0.16) {
        const t = (y - 0.16) / (0.52 - 0.16);
        return { indices: [leg, foot, 0, 0], weights: [0.8 + 0.2 * t, (1.0 - t) * 0.2, 0, 0] };
      } else {
        return { indices: [leg, foot, 0, 0], weights: [0.4, 0.6, 0, 0] };
      }
    }

    // Torso skinning
    if (y >= 1.40) {
      const t = Math.min(1.0, (y - 1.40) / 0.05);
      return { indices: [JOINTS.Neck, JOINTS.Spine2, 0, 0], weights: [t * 0.8, 1.0 - t * 0.8, 0, 0] };
    } else if (y >= 1.25) {
      const t = (y - 1.25) / 0.15;
      return { indices: [JOINTS.Spine2, JOINTS.Spine1, 0, 0], weights: [t, 1 - t, 0, 0] };
    } else if (y >= 1.10) {
      const t = (y - 1.10) / 0.15;
      return { indices: [JOINTS.Spine1, JOINTS.Spine, 0, 0], weights: [t, 1 - t, 0, 0] };
    } else if (y >= 0.98) {
      const t = (y - 0.98) / 0.12;
      return { indices: [JOINTS.Spine, JOINTS.Hips, 0, 0], weights: [t, 1 - t, 0, 0] };
    } else {
      return { indices: [JOINTS.Hips, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    }
  });
}

const body = createAnatomicalBodyGeometry();
console.log("Anatomical body verts:", body.attributes.position.count, "faces:", body.index.count / 3);
