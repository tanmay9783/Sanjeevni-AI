// Sanjeevni AI — Doctor Wardrobe & Anatomy Definition
// Precision 3D Watertight Garments with Layered Thickness & Native Mixamo 67-Bone Skinning

import * as THREE from "three";

// ── Joint Index Constants in Skin 0 ────────────────────────────
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

// ── Continuous Torso Skinning Calculator ───────────────────────
export function skinTorso(x, y, z) {
  if (y >= 1.40) {
    const t = Math.min(1.0, (y - 1.40) / 0.06);
    return { indices: [JOINTS.Neck, JOINTS.Spine2, 0, 0], weights: [t * 0.75, 1.0 - t * 0.75, 0, 0] };
  } else if (y >= 1.24) {
    const t = (y - 1.24) / 0.16;
    return { indices: [JOINTS.Spine2, JOINTS.Spine1, 0, 0], weights: [t, 1 - t, 0, 0] };
  } else if (y >= 1.08) {
    const t = (y - 1.08) / 0.16;
    return { indices: [JOINTS.Spine1, JOINTS.Spine, 0, 0], weights: [t, 1 - t, 0, 0] };
  } else if (y >= 0.88) {
    const t = (y - 0.88) / 0.20;
    return { indices: [JOINTS.Spine, JOINTS.Hips, 0, 0], weights: [t, 1 - t, 0, 0] };
  } else {
    return { indices: [JOINTS.Hips, 0, 0, 0], weights: [1.0, 0, 0, 0] };
  }
}

// ── Continuous Arm Skinning Calculator ─────────────────────────
export function skinArm(isLeft, x, y, z) {
  const sh = isLeft ? JOINTS.LeftShoulder : JOINTS.RightShoulder;
  const arm = isLeft ? JOINTS.LeftArm : JOINTS.RightArm;
  const fa = isLeft ? JOINTS.LeftForeArm : JOINTS.RightForeArm;

  if (y > 1.34) {
    const t = Math.min(1.0, (y - 1.34) / 0.10);
    return { indices: [sh, arm, 0, 0], weights: [0.35 + 0.65 * t, (1.0 - t) * 0.65, 0, 0] };
  } else if (y > 1.16) {
    const t = (y - 1.16) / 0.18;
    return { indices: [arm, fa, 0, 0], weights: [t, 1 - t, 0, 0] };
  } else {
    return { indices: [fa, 0, 0, 0], weights: [1.0, 0, 0, 0] };
  }
}

// ── Continuous Leg Skinning Calculator ─────────────────────────
export function skinLeg(isLeft, x, y, z) {
  const upLeg = isLeft ? JOINTS.LeftUpLeg : JOINTS.RightUpLeg;
  const leg = isLeft ? JOINTS.LeftLeg : JOINTS.RightLeg;
  const foot = isLeft ? JOINTS.LeftFoot : JOINTS.RightFoot;

  // Crotch / saddle bridge: blend smoothly across centerline
  const isCrotch = Math.abs(x) < 0.045 && y > 0.78;
  if (isCrotch) {
    const legWeight = Math.max(0, (0.88 - y) / (0.88 - 0.78)) * 0.40;
    return {
      indices: [JOINTS.Hips, JOINTS.LeftUpLeg, JOINTS.RightUpLeg, 0],
      weights: [1.0 - legWeight, legWeight * 0.5, legWeight * 0.5, 0],
    };
  }

  if (y > 0.72) {
    const t = (y - 0.72) / (0.90 - 0.72);
    return { indices: [JOINTS.Hips, upLeg, 0, 0], weights: [t * 0.70, 1.0 - t * 0.70, 0, 0] };
  } else if (y > 0.50) {
    const t = (y - 0.50) / (0.72 - 0.50);
    return { indices: [upLeg, leg, 0, 0], weights: [0.30 + 0.70 * t, (1.0 - t) * 0.70, 0, 0] };
  } else if (y > 0.16) {
    const t = (y - 0.16) / (0.50 - 0.16);
    return { indices: [leg, foot, 0, 0], weights: [0.75 + 0.25 * t, (1.0 - t) * 0.25, 0, 0] };
  } else {
    return { indices: [leg, foot, 0, 0], weights: [0.35, 0.65, 0, 0] };
  }
}

function applySkinningBuffers(geometry, skinIndices, skinWeights) {
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.computeVertexNormals();
  return geometry;
}

// ── 0. Complete Underlying Anatomical Human Body Geometry ───────
export function createAnatomicalBodyGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const skinIndices = [];
  const skinWeights = [];

  function addVert(x, y, z, u, v, skinningFn) {
    const idx = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(u, v);
    const { indices: sIdx, weights: sW } = skinningFn(x, y, z);
    const sum = sW.reduce((a, b) => a + b, 0) || 1.0;
    skinIndices.push(sIdx[0] || 0, sIdx[1] || 0, sIdx[2] || 0, sIdx[3] || 0);
    skinWeights.push(sW[0] / sum, (sW[1] || 0) / sum, (sW[2] || 0) / sum, (sW[3] || 0) / sum);
    return idx;
  }

  // Torso column
  const torsoRings = [
    { y: 1.45, rx: 0.052, rz: 0.055, zc: 0.005 },
    { y: 1.41, rx: 0.075, rz: 0.065, zc: 0.008 },
    { y: 1.38, rx: 0.135, rz: 0.078, zc: 0.012 },
    { y: 1.34, rx: 0.138, rz: 0.084, zc: 0.016 },
    { y: 1.26, rx: 0.136, rz: 0.086, zc: 0.020 },
    { y: 1.18, rx: 0.130, rz: 0.080, zc: 0.022 },
    { y: 1.10, rx: 0.124, rz: 0.076, zc: 0.024 },
    { y: 1.02, rx: 0.136, rz: 0.084, zc: 0.026 },
    { y: 0.94, rx: 0.150, rz: 0.092, zc: 0.028 },
    { y: 0.86, rx: 0.155, rz: 0.096, zc: 0.030 },
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
      addVert(px, py, pz, s / tSlices, r / (torsoRings.length - 1), (x, y, z) => skinTorso(x, y, z));
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

  // Arms
  function createArm(isLeft) {
    const sign = isLeft ? 1 : -1;
    const armRings = [
      { y: 1.40, x: sign * 0.145, z: -0.005, r: 0.046 },
      { y: 1.34, x: sign * 0.190, z: -0.012, r: 0.042 },
      { y: 1.26, x: sign * 0.240, z: -0.016, r: 0.038 },
      { y: 1.18, x: sign * 0.290, z: 0.005,  r: 0.035 },
      { y: 1.11, x: sign * 0.335, z: 0.035,  r: 0.032 },
      { y: 1.05, x: sign * 0.370, z: 0.060,  r: 0.028 },
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
        addVert(px, py, pz, s / aSlices, r / (armRings.length - 1), (x, y, z) => skinArm(isLeft, x, y, z));
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
  createArm(true);
  createArm(false);

  // Legs
  function createLeg(isLeft) {
    const sign = isLeft ? 1 : -1;
    const legX = sign * 0.090;
    const legRings = [
      { y: 0.84, rx: 0.072, rz: 0.074, zc: 0.028 },
      { y: 0.74, rx: 0.068, rz: 0.070, zc: 0.022 },
      { y: 0.62, rx: 0.062, rz: 0.064, zc: 0.016 },
      { y: 0.50, rx: 0.054, rz: 0.056, zc: 0.012 },
      { y: 0.38, rx: 0.050, rz: 0.052, zc: 0.010 },
      { y: 0.26, rx: 0.046, rz: 0.048, zc: 0.008 },
      { y: 0.14, rx: 0.042, rz: 0.044, zc: 0.006 },
      { y: 0.08, rx: 0.038, rz: 0.040, zc: 0.005 },
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
        addVert(px, py, pz, s / lSlices, r / (legRings.length - 1), (x, y, z) => skinLeg(isLeft, x, y, z));
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
  createLeg(true);
  createLeg(false);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return applySkinningBuffers(geom, skinIndices, skinWeights);
}

// ── 1. Complete Deep Teal Medical Scrub Top (Inner Layer) ───────
export function createScrubTopGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const skinIndices = [];
  const skinWeights = [];

  function addVert(x, y, z, u, v, skinningFn) {
    const idx = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(u, v);
    const { indices: sIdx, weights: sW } = skinningFn(x, y, z);
    const sum = sW.reduce((a, b) => a + b, 0) || 1.0;
    skinIndices.push(sIdx[0] || 0, sIdx[1] || 0, sIdx[2] || 0, sIdx[3] || 0);
    skinWeights.push(sW[0] / sum, (sW[1] || 0) / sum, (sW[2] || 0) / sum, (sW[3] || 0) / sum);
    return idx;
  }

  const trunkRings = [
    { y: 0.82, rx: 0.165, rz: 0.106, zc: 0.032, vDip: 0 },
    { y: 0.92, rx: 0.162, rz: 0.104, zc: 0.030, vDip: 0 },
    { y: 1.02, rx: 0.155, rz: 0.098, zc: 0.028, vDip: 0 },
    { y: 1.12, rx: 0.144, rz: 0.092, zc: 0.025, vDip: 0 },
    { y: 1.22, rx: 0.148, rz: 0.096, zc: 0.022, vDip: 0 },
    { y: 1.30, rx: 0.154, rz: 0.100, zc: 0.018, vDip: 0 },
    { y: 1.36, rx: 0.156, rz: 0.100, zc: 0.014, vDip: 0.038 },
    { y: 1.42, rx: 0.142, rz: 0.092, zc: 0.008, vDip: 0.020 },
    { y: 1.46, rx: 0.095, rz: 0.082, zc: 0.002, vDip: 0.000 },
  ];

  const tSlices = 28;
  const tStarts = [];

  for (let r = 0; r < trunkRings.length; r++) {
    const ring = trunkRings[r];
    const start = positions.length / 3;
    for (let s = 0; s <= tSlices; s++) {
      const theta = (s / tSlices) * Math.PI * 2;
      let px = Math.sin(theta) * ring.rx;
      let pz = ring.zc + Math.cos(theta) * ring.rz;
      let py = ring.y;

      if (ring.vDip > 0 && Math.cos(theta) > 0.50) {
        py -= ring.vDip * (Math.cos(theta) - 0.50) * 3.0;
        pz += 0.003;
      }

      addVert(px, py, pz, s / tSlices, r / (trunkRings.length - 1), (x, y, z) => skinTorso(x, y, z));
    }
    tStarts.push(start);
  }

  for (let r = 0; r < trunkRings.length - 1; r++) {
    const cur = tStarts[r];
    const next = tStarts[r + 1];
    for (let s = 0; s < tSlices; s++) {
      indices.push(cur + s, next + s, cur + s + 1);
      indices.push(cur + s + 1, next + s, next + s + 1);
    }
  }

  function createShortSleeve(isLeft) {
    const sign = isLeft ? 1 : -1;
    const sleeveRings = [
      { y: 1.44, x: sign * 0.142, z: -0.005, r: 0.045 },
      { y: 1.39, x: sign * 0.175, z: -0.010, r: 0.042 },
      { y: 1.33, x: sign * 0.205, z: -0.015, r: 0.038 },
    ];
    const slices = 14;
    const sStarts = [];
    for (let r = 0; r < sleeveRings.length; r++) {
      const ring = sleeveRings[r];
      const start = positions.length / 3;
      for (let s = 0; s <= slices; s++) {
        const phi = (s / slices) * Math.PI * 2;
        const px = ring.x + Math.cos(phi) * ring.r * 0.88;
        const py = ring.y + Math.sin(phi) * ring.r * 0.70;
        const pz = ring.z + Math.sin(phi) * ring.r;
        addVert(px, py, pz, s / slices, r / (sleeveRings.length - 1), (x, y, z) => skinArm(isLeft, x, y, z));
      }
      sStarts.push(start);
    }
    for (let r = 0; r < sleeveRings.length - 1; r++) {
      const cur = sStarts[r];
      const next = sStarts[r + 1];
      for (let s = 0; s < slices; s++) {
        indices.push(cur + s, isLeft ? next + s : cur + s + 1, isLeft ? cur + s + 1 : next + s);
        indices.push(cur + s + 1, isLeft ? next + s : next + s + 1, isLeft ? next + s + 1 : next + s);
      }
    }
  }
  createShortSleeve(true);
  createShortSleeve(false);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return applySkinningBuffers(geom, skinIndices, skinWeights);
}

// ── 2. Continuous Watertight Deep Teal Scrub Trousers ────────────
export function createScrubTrousersGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const skinIndices = [];
  const skinWeights = [];

  function addVert(x, y, z, u, v, skinningFn) {
    const idx = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(u, v);
    const { indices: sIdx, weights: sW } = skinningFn(x, y, z);
    const sum = sW.reduce((a, b) => a + b, 0) || 1.0;
    skinIndices.push(sIdx[0] || 0, sIdx[1] || 0, sIdx[2] || 0, sIdx[3] || 0);
    skinWeights.push(sW[0] / sum, (sW[1] || 0) / sum, (sW[2] || 0) / sum, (sW[3] || 0) / sum);
    return idx;
  }

  const pelvisRings = [
    { y: 1.05, rx: 0.170, rz: 0.112, zc: 0.035 },
    { y: 0.98, rx: 0.175, rz: 0.116, zc: 0.036 },
    { y: 0.92, rx: 0.178, rz: 0.120, zc: 0.037 },
    { y: 0.86, rx: 0.180, rz: 0.122, zc: 0.038 },
  ];

  const pSlices = 28;
  const pStarts = [];
  for (let r = 0; r < pelvisRings.length; r++) {
    const ring = pelvisRings[r];
    const start = positions.length / 3;
    for (let s = 0; s <= pSlices; s++) {
      const theta = (s / pSlices) * Math.PI * 2;
      const px = Math.sin(theta) * ring.rx;
      const py = ring.y;
      const pz = ring.zc + Math.cos(theta) * ring.rz;
      addVert(px, py, pz, s / pSlices, r / (pelvisRings.length - 1), (x, y, z) => skinLeg(x >= 0, x, y, z));
    }
    pStarts.push(start);
  }

  for (let r = 0; r < pelvisRings.length - 1; r++) {
    const cur = pStarts[r];
    const next = pStarts[r + 1];
    for (let s = 0; s < pSlices; s++) {
      indices.push(cur + s, next + s, cur + s + 1);
      indices.push(cur + s + 1, next + s, next + s + 1);
    }
  }

  // Crotch Bridge
  const crotchY = 0.85;
  const bridgeSteps = 6;
  const bridgeStarts = [];
  for (let b = 0; b <= bridgeSteps; b++) {
    const v = b / bridgeSteps;
    const start = positions.length / 3;
    const z = 0.080 - v * 0.145;
    const dip = Math.sin(v * Math.PI) * 0.022;
    const y = crotchY - dip;

    for (let w = -2; w <= 2; w++) {
      const px = w * 0.018;
      addVert(px, y, z, (w + 2) / 4, v, (x, y2, z2) => skinLeg(x >= 0, x, y2, z2));
    }
    bridgeStarts.push(start);
  }
  for (let b = 0; b < bridgeSteps; b++) {
    const cur = bridgeStarts[b];
    const next = bridgeStarts[b + 1];
    for (let w = 0; w < 4; w++) {
      indices.push(cur + w, next + w, cur + w + 1);
      indices.push(cur + w + 1, next + w, next + w + 1);
    }
  }

  function createLeg(isLeft) {
    const sign = isLeft ? 1 : -1;
    const legX = sign * 0.095;
    const legRings = [
      { y: 0.85, rx: 0.086, rz: 0.086, zc: 0.030 },
      { y: 0.76, rx: 0.082, rz: 0.082, zc: 0.024 },
      { y: 0.66, rx: 0.078, rz: 0.078, zc: 0.018 },
      { y: 0.54, rx: 0.074, rz: 0.074, zc: 0.014 },
      { y: 0.42, rx: 0.072, rz: 0.072, zc: 0.012 },
      { y: 0.30, rx: 0.070, rz: 0.070, zc: 0.010 },
      { y: 0.18, rx: 0.068, rz: 0.068, zc: 0.008 },
      { y: 0.12, rx: 0.065, rz: 0.065, zc: 0.006 },
    ];
    const lSlices = 20;
    const lStarts = [];
    for (let r = 0; r < legRings.length; r++) {
      const ring = legRings[r];
      const start = positions.length / 3;
      for (let s = 0; s <= lSlices; s++) {
        const theta = (s / lSlices) * Math.PI * 2;
        const px = legX + Math.sin(theta) * ring.rx;
        const py = ring.y;
        const pz = ring.zc + Math.cos(theta) * ring.rz;
        addVert(px, py, pz, s / lSlices, r / (legRings.length - 1), (x, y, z) => skinLeg(isLeft, x, y, z));
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
  createLeg(true);
  createLeg(false);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return applySkinningBuffers(geom, skinIndices, skinWeights);
}

// ── 3. Tailored Physician Lab Coat (Outer Layer) ────────────────
export function createLabCoatGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const skinIndices = [];
  const skinWeights = [];

  function addVert(x, y, z, u, v, skinningFn) {
    const idx = positions.length / 3;
    positions.push(x, y, z);
    uvs.push(u, v);
    const { indices: sIdx, weights: sW } = skinningFn(x, y, z);
    const sum = sW.reduce((a, b) => a + b, 0) || 1.0;
    skinIndices.push(sIdx[0] || 0, sIdx[1] || 0, sIdx[2] || 0, sIdx[3] || 0);
    skinWeights.push(sW[0] / sum, (sW[1] || 0) / sum, (sW[2] || 0) / sum, (sW[3] || 0) / sum);
    return idx;
  }

  const rings = [
    { y: 1.46, xc: 0.0, zc: -0.015, rx: 0.115, rz: 0.115, gap: 0.030, yDip: 0.035 }, // Collar rim dipping in front
    { y: 1.42, xc: 0.0, zc: -0.005, rx: 0.185, rz: 0.125, gap: 0.035, yDip: 0.015 }, // Broad shoulder yoke
    { y: 1.36, xc: 0.0, zc: 0.005,  rx: 0.185, rz: 0.130, gap: 0.038, yDip: 0 },
    { y: 1.30, xc: 0.0, zc: 0.010,  rx: 0.182, rz: 0.130, gap: 0.040, yDip: 0 },
    { y: 1.24, xc: 0.0, zc: 0.016,  rx: 0.180, rz: 0.130, gap: 0.042, yDip: 0 },
    { y: 1.18, xc: 0.0, zc: 0.022,  rx: 0.182, rz: 0.134, gap: 0.044, yDip: 0 },
    { y: 1.12, xc: 0.0, zc: 0.026,  rx: 0.188, rz: 0.138, gap: 0.046, yDip: 0 },
    { y: 1.05, xc: 0.0, zc: 0.030,  rx: 0.198, rz: 0.146, gap: 0.048, yDip: 0 },
    { y: 0.98, xc: 0.0, zc: 0.032,  rx: 0.210, rz: 0.152, gap: 0.050, yDip: 0 },
    { y: 0.90, xc: 0.0, zc: 0.028,  rx: 0.218, rz: 0.156, gap: 0.052, yDip: 0 },
    { y: 0.82, xc: 0.0, zc: 0.022,  rx: 0.224, rz: 0.158, gap: 0.054, yDip: 0 },
    { y: 0.74, xc: 0.0, zc: 0.016,  rx: 0.228, rz: 0.160, gap: 0.055, yDip: 0 },
    { y: 0.68, xc: 0.0, zc: 0.010,  rx: 0.230, rz: 0.162, gap: 0.056, yDip: 0 },
  ];

  const numSlices = 32;
  const ringStarts = [];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const vertStart = positions.length / 3;
    const minTheta = Math.asin(Math.min(0.85, ring.gap / ring.rx));
    const maxTheta = 2 * Math.PI - minTheta;

    for (let s = 0; s <= numSlices; s++) {
      const t = s / numSlices;
      const theta = minTheta + t * (maxTheta - minTheta);
      const px = ring.xc + Math.sin(theta) * ring.rx;
      let py = ring.y;
      if (ring.yDip && Math.cos(theta) > 0.2) {
        py -= ring.yDip * (Math.cos(theta) - 0.2) * 1.25;
      }
      const pz = ring.zc + Math.cos(theta) * ring.rz;
      addVert(px, py, pz, t, r / (rings.length - 1), (x, y, z) => skinTorso(x, y, z));
    }
    ringStarts.push({ start: vertStart, count: numSlices + 1 });
  }

  for (let r = 0; r < rings.length - 1; r++) {
    const cur = ringStarts[r];
    const next = ringStarts[r + 1];
    for (let s = 0; s < numSlices; s++) {
      indices.push(cur.start + s, next.start + s, cur.start + s + 1);
      indices.push(cur.start + s + 1, next.start + s, next.start + s + 1);
    }
  }

  // Notched lapels
  function createNotchedLapel(isLeft) {
    const sign = isLeft ? 1 : -1;
    const lStart = positions.length / 3;
    const outer = [
      [sign * 0.035, 1.43, 0.098],
      [sign * 0.140, 1.40, 0.132],
      [sign * 0.110, 1.35, 0.140],
      [sign * 0.150, 1.32, 0.150],
      [sign * 0.100, 1.25, 0.146],
      [sign * 0.048, 1.20, 0.142],
    ];
    const inner = [
      [sign * 0.025, 1.43, 0.095],
      [sign * 0.030, 1.40, 0.112],
      [sign * 0.036, 1.35, 0.124],
      [sign * 0.040, 1.32, 0.130],
      [sign * 0.044, 1.25, 0.136],
      [sign * 0.048, 1.20, 0.140],
    ];
    for (let i = 0; i < outer.length; i++) {
      addVert(inner[i][0], inner[i][1], inner[i][2], 0, i / (outer.length - 1), (x, y, z) => skinTorso(x, y, z));
      addVert(outer[i][0], outer[i][1], outer[i][2] + 0.003, 1, i / (outer.length - 1), (x, y, z) => skinTorso(x, y, z));
    }
    for (let i = 0; i < outer.length - 1; i++) {
      const v0 = lStart + i * 2;
      const v1 = lStart + i * 2 + 1;
      const v2 = lStart + (i + 1) * 2;
      const v3 = lStart + (i + 1) * 2 + 1;
      if (isLeft) {
        indices.push(v0, v1, v2);
        indices.push(v1, v3, v2);
      } else {
        indices.push(v0, v2, v1);
        indices.push(v1, v2, v3);
      }
    }
  }
  createNotchedLapel(true);
  createNotchedLapel(false);

  // Sleeves
  function createSleeve(isLeft) {
    const sign = isLeft ? 1 : -1;
    const sleeveRings = [
      { y: 1.42, x: sign * 0.155, z: -0.010, r: 0.062 }, // Armscye seam right at shoulder crest
      { y: 1.37, x: sign * 0.190, z: -0.018, r: 0.058 },
      { y: 1.31, x: sign * 0.240, z: -0.022, r: 0.054 },
      { y: 1.24, x: sign * 0.290, z: -0.024, r: 0.050 },
      { y: 1.17, x: sign * 0.332, z: 0.004,  r: 0.046 },
      { y: 1.10, x: sign * 0.372, z: 0.038,  r: 0.044 },
      { y: 1.05, x: sign * 0.405, z: 0.068,  r: 0.042 },
    ];
    const sSlices = 16;
    const sStarts = [];
    for (let r = 0; r < sleeveRings.length; r++) {
      const ring = sleeveRings[r];
      const start = positions.length / 3;
      for (let s = 0; s <= sSlices; s++) {
        const phi = (s / sSlices) * Math.PI * 2;
        const px = ring.x + Math.cos(phi) * ring.r * 0.88;
        const py = ring.y + Math.sin(phi) * ring.r * 0.88 * 0.72;
        const pz = ring.z + Math.sin(phi) * ring.r;
        addVert(px, py, pz, s / sSlices, r / (sleeveRings.length - 1), (x, y, z) => skinArm(isLeft, x, y, z));
      }
      sStarts.push(start);
    }
    for (let r = 0; r < sleeveRings.length - 1; r++) {
      const cur = sStarts[r];
      const next = sStarts[r + 1];
      for (let s = 0; s < sSlices; s++) {
        indices.push(cur + s, isLeft ? next + s : cur + s + 1, isLeft ? cur + s + 1 : next + s);
        indices.push(cur + s + 1, isLeft ? next + s : next + s + 1, isLeft ? next + s + 1 : next + s);
      }
    }
  }
  createSleeve(true);
  createSleeve(false);

  // Curved 3D Patch Pockets that cling to the cylindrical coat fabric
  function createCurvedPatchPocket(xMin, xMax, yMin, yMax, ringRx, ringRz, ringZc) {
    const stepsX = 6;
    const stepsY = 4;
    const pStarts = [];

    for (let r = 0; r <= stepsY; r++) {
      const v = r / stepsY;
      const y = yMin + v * (yMax - yMin);
      const sStart = positions.length / 3;

      for (let s = 0; s <= stepsX; s++) {
        const u = s / stepsX;
        const x = xMin + u * (xMax - xMin);
        const sinTheta = Math.max(-0.95, Math.min(0.95, x / ringRx));
        const cosTheta = Math.sqrt(Math.max(0, 1 - sinTheta * sinTheta));
        const z = ringZc + cosTheta * ringRz + 0.005; // 5mm proud of coat surface

        addVert(x, y, z, u, v, (px, py, pz) => skinTorso(px, py, pz));
      }
      pStarts.push(sStart);
    }

    for (let r = 0; r < stepsY; r++) {
      const cur = pStarts[r];
      const next = pStarts[r + 1];
      for (let s = 0; s < stepsX; s++) {
        indices.push(cur + s, next + s, cur + s + 1);
        indices.push(cur + s + 1, next + s, next + s + 1);
      }
    }
  }

  // 1. Upper Left Chest Pocket (under badge)
  createCurvedPatchPocket(0.055, 0.125, 1.23, 1.32, 0.182, 0.130, 0.010);
  // 2. Lower Left Hip Pocket (matches reference photo)
  createCurvedPatchPocket(0.080, 0.170, 0.74, 0.88, 0.224, 0.158, 0.020);
  // 3. Lower Right Hip Pocket (matches reference photo)
  createCurvedPatchPocket(-0.170, -0.080, 0.74, 0.88, 0.224, 0.158, 0.020);

  // 4 White Placket Buttons
  [1.18, 1.05, 0.92, 0.80].forEach(by => {
    const btn = new THREE.CylinderGeometry(0.0065, 0.0065, 0.003, 12);
    btn.rotateX(Math.PI / 2);
    btn.translate(-0.040, by, 0.144);
    const bp = btn.attributes.position.array;
    const bi = btn.index.array;
    const bs = positions.length / 3;
    for (let i = 0; i < bp.length; i += 3) {
      addVert(bp[i], bp[i + 1], bp[i + 2], 0.5, 0.5, (x, y, z) => skinTorso(x, y, z));
    }
    for (let i = 0; i < bi.length; i++) {
      indices.push(bi[i] + bs);
    }
  });

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return applySkinningBuffers(geom, skinIndices, skinWeights);
}

// ── 4. White Athletic Medical Sneakers ──────────────────────────
export function createSneakersGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  function createShoe(isLeft) {
    const sign = isLeft ? 1 : -1;
    const footX = sign * 0.098;

    const soleLevels = [
      { y: 0.010, zFront: 0.165, zBack: -0.095, rx: 0.052, rz: 0.130 },
      { y: 0.035, zFront: 0.170, zBack: -0.098, rx: 0.054, rz: 0.134 },
      { y: 0.060, zFront: 0.165, zBack: -0.095, rx: 0.050, rz: 0.130 },
    ];

    const soleSlices = 18;
    const soleStarts = [];

    for (let l = 0; l < soleLevels.length; l++) {
      const lvl = soleLevels[l];
      const start = positions.length / 3;
      const zc = (lvl.zFront + lvl.zBack) * 0.5;
      const rz = (lvl.zFront - lvl.zBack) * 0.5;

      for (let s = 0; s <= soleSlices; s++) {
        const theta = (s / soleSlices) * Math.PI * 2;
        const px = footX + Math.sin(theta) * lvl.rx;
        let py = lvl.y;
        if (Math.cos(theta) > 0.4) {
          py += 0.016 * (Math.cos(theta) - 0.4);
        } else if (Math.cos(theta) < -0.3) {
          py += 0.020 * Math.abs(Math.cos(theta) + 0.3);
        }
        const pz = zc + Math.cos(theta) * rz;
        positions.push(px, py, pz);
        uvs.push(s / soleSlices, l / (soleLevels.length - 1));
      }
      soleStarts.push(start);
    }

    for (let l = 0; l < soleLevels.length - 1; l++) {
      const cur = soleStarts[l];
      const next = soleStarts[l + 1];
      for (let s = 0; s < soleSlices; s++) {
        indices.push(cur + s, isLeft ? next + s : cur + s + 1, isLeft ? cur + s + 1 : next + s);
        indices.push(cur + s + 1, isLeft ? next + s : next + s + 1, isLeft ? next + s + 1 : next + s);
      }
    }

    const upperLevels = [
      { y: 0.065, zc: 0.035, rx: 0.048, rz: 0.125 },
      { y: 0.088, zc: 0.032, rx: 0.045, rz: 0.115 },
      { y: 0.115, zc: 0.024, rx: 0.040, rz: 0.095 },
    ];

    const upperStarts = [];
    for (let l = 0; l < upperLevels.length; l++) {
      const lvl = upperLevels[l];
      const start = positions.length / 3;
      for (let s = 0; s <= soleSlices; s++) {
        const theta = (s / soleSlices) * Math.PI * 2;
        const px = footX + Math.sin(theta) * lvl.rx;
        let py = lvl.y;
        if (Math.cos(theta) > 0.6 && l === 2) py += 0.014;
        const pz = lvl.zc + Math.cos(theta) * lvl.rz;
        positions.push(px, py, pz);
        uvs.push(s / soleSlices, 0.4 + 0.6 * (l / (upperLevels.length - 1)));
      }
      upperStarts.push(start);
    }

    for (let l = 0; l < upperLevels.length - 1; l++) {
      const cur = upperStarts[l];
      const next = upperStarts[l + 1];
      for (let s = 0; s < soleSlices; s++) {
        indices.push(cur + s, isLeft ? next + s : cur + s + 1, isLeft ? cur + s + 1 : next + s);
        indices.push(cur + s + 1, isLeft ? next + s : next + s + 1, isLeft ? next + s + 1 : next + s);
      }
    }

    const topSole = soleStarts[soleStarts.length - 1];
    const baseUpper = upperStarts[0];
    for (let s = 0; s < soleSlices; s++) {
      indices.push(topSole + s, isLeft ? baseUpper + s : topSole + s + 1, isLeft ? topSole + s + 1 : baseUpper + s);
      indices.push(topSole + s + 1, isLeft ? baseUpper + s : baseUpper + s + 1, isLeft ? baseUpper + s + 1 : baseUpper + s);
    }

    const laceYs = [0.082, 0.094, 0.106, 0.118];
    const laceZs = [0.095, 0.080, 0.065, 0.050];
    for (let k = 0; k < laceYs.length; k++) {
      const lY = laceYs[k];
      const lZ = laceZs[k];
      const lStart = positions.length / 3;
      const lx = 0.022;
      positions.push(footX - lx, lY, lZ, footX + lx, lY, lZ, footX + lx, lY + 0.005, lZ - 0.002, footX - lx, lY + 0.005, lZ - 0.002);
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      indices.push(lStart, lStart + 1, lStart + 2, lStart, lStart + 2, lStart + 3);
    }
  }

  createShoe(true);
  createShoe(false);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  const skinIndices = [];
  const skinWeights = [];
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const isLeft = pos.getX(i) >= 0;
    const foot = isLeft ? JOINTS.LeftFoot : JOINTS.RightFoot;
    const toe = isLeft ? JOINTS.LeftToeBase : JOINTS.RightToeBase;
    const z = pos.getZ(i);
    if (z > 0.08) {
      skinIndices.push(toe, foot, 0, 0);
      skinWeights.push(0.85, 0.15, 0, 0);
    } else {
      skinIndices.push(foot, toe, 0, 0);
      skinWeights.push(0.90, 0.10, 0, 0);
    }
  }
  return applySkinningBuffers(geom, skinIndices, skinWeights);
}

// ── 5. Anatomical Medical Stethoscope ───────────────────────────
export function createStethoscopeGeometry() {
  const tubePoints = [
    new THREE.Vector3(-0.046, 1.470, -0.038),
    new THREE.Vector3(-0.082, 1.442,  0.020),
    new THREE.Vector3(-0.078, 1.385,  0.115),
    new THREE.Vector3(-0.056, 1.320,  0.160),
    new THREE.Vector3(-0.035, 1.250,  0.172),
    new THREE.Vector3( 0.015, 1.265,  0.170),
    new THREE.Vector3( 0.056, 1.325,  0.155),
    new THREE.Vector3( 0.078, 1.390,  0.110),
    new THREE.Vector3( 0.082, 1.442,  0.020),
    new THREE.Vector3( 0.046, 1.470, -0.038),
  ];

  const tubeCurve = new THREE.CatmullRomCurve3(tubePoints);
  const tubeGeom = new THREE.TubeGeometry(tubeCurve, 54, 0.0065, 10, false);

  const diaphragm = new THREE.CylinderGeometry(0.024, 0.024, 0.007, 24);
  diaphragm.rotateX(Math.PI / 2);
  diaphragm.translate(-0.035, 1.238, 0.176);

  const bell = new THREE.CylinderGeometry(0.016, 0.016, 0.005, 20);
  bell.rotateX(Math.PI / 2);
  bell.translate(-0.035, 1.238, 0.168);

  const stem = new THREE.CylinderGeometry(0.004, 0.004, 0.014, 12);
  stem.rotateZ(0.3);
  stem.translate(-0.035, 1.250, 0.174);

  const leftBinaural = new THREE.CylinderGeometry(0.003, 0.003, 0.065, 8);
  leftBinaural.rotateZ(-0.35);
  leftBinaural.translate(0.048, 1.370, 0.156);

  const rightBinaural = new THREE.CylinderGeometry(0.003, 0.003, 0.065, 8);
  rightBinaural.rotateZ(-0.15);
  rightBinaural.translate(0.062, 1.365, 0.154);

  const leftEartip = new THREE.SphereGeometry(0.0055, 8, 8);
  leftEartip.translate(0.038, 1.398, 0.158);

  const rightEartip = new THREE.SphereGeometry(0.0055, 8, 8);
  rightEartip.translate(0.058, 1.395, 0.156);

  const geoms = [tubeGeom, diaphragm, bell, stem, leftBinaural, rightBinaural, leftEartip, rightEartip];
  let totalVerts = 0;
  let totalIdx = 0;
  geoms.forEach((g) => {
    totalVerts += g.attributes.position.count;
    totalIdx += g.index ? g.index.count : 0;
  });

  const mergedPos = new Float32Array(totalVerts * 3);
  const mergedIdx = new Uint16Array(totalIdx);
  let vOffset = 0;
  let iOffset = 0;

  geoms.forEach((g) => {
    const p = g.attributes.position.array;
    mergedPos.set(p, vOffset * 3);
    if (g.index) {
      const idx = g.index.array;
      for (let k = 0; k < idx.length; k++) {
        mergedIdx[iOffset + k] = idx[k] + vOffset;
      }
      iOffset += idx.length;
    }
    vOffset += g.attributes.position.count;
  });

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(mergedPos, 3));
  geom.setIndex(new THREE.BufferAttribute(mergedIdx, 1));

  const skinIndices = [];
  const skinWeights = [];
  for (let i = 0; i < totalVerts; i++) {
    const px = mergedPos[i * 3];
    const py = mergedPos[i * 3 + 1];
    const pz = mergedPos[i * 3 + 2];
    const { indices: sIdx, weights: sW } = skinTorso(px, py, pz);
    skinIndices.push(sIdx[0] || 0, sIdx[1] || 0, sIdx[2] || 0, sIdx[3] || 0);
    skinWeights.push(sW[0], sW[1], sW[2], sW[3]);
  }
  return applySkinningBuffers(geom, skinIndices, skinWeights);
}

// ── 6. Hospital Identification Badge Card ──────────────────────
export function createIDBadgeGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  const cardX = 0.088;
  const cardY = 1.285;
  const cardZ = 0.156;
  const w = 0.058 * 0.5;
  const h = 0.082 * 0.5;

  const cStart = positions.length / 3;
  positions.push(
    cardX - w, cardY - h, cardZ,
    cardX + w, cardY - h, cardZ,
    cardX + w, cardY + h, cardZ,
    cardX - w, cardY + h, cardZ
  );
  uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
  indices.push(cStart, cStart + 1, cStart + 2, cStart, cStart + 2, cStart + 3);

  const clip = new THREE.BoxGeometry(0.016, 0.012, 0.006);
  clip.translate(cardX, cardY + h + 0.006, cardZ - 0.001);
  const clPos = clip.attributes.position.array;
  const clIdx = clip.index.array;
  const clStart = positions.length / 3;

  for (let i = 0; i < clPos.length; i += 3) {
    positions.push(clPos[i], clPos[i + 1], clPos[i + 2]);
    uvs.push(0.5, 0.5);
  }
  for (let i = 0; i < clIdx.length; i++) {
    indices.push(clIdx[i] + clStart);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  const skinIndices = [];
  const skinWeights = [];
  for (let i = 0; i < positions.length / 3; i++) {
    const px = positions[i * 3];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];
    const { indices: sIdx, weights: sW } = skinTorso(px, py, pz);
    skinIndices.push(sIdx[0] || 0, sIdx[1] || 0, sIdx[2] || 0, sIdx[3] || 0);
    skinWeights.push(sW[0], sW[1], sW[2], sW[3]);
  }
  return applySkinningBuffers(geom, skinIndices, skinWeights);
}

// ── 7. Sleek Volumetric Hair (Layered Crown Volume + Center Part + Nape Bun) ──
export function createPonytailHairGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  const skullY = 1.646;
  const skullZ = 0.042;
  const rx = 0.098;
  const ry = 0.104;
  const rz = 0.106;

  const rings = 18;
  const slices = 36;
  const capStarts = [];

  for (let r = 0; r <= rings; r++) {
    const v = r / rings;
    const start = positions.length / 3;

    for (let s = 0; s <= slices; s++) {
      const u = s / slices;
      const theta = u * Math.PI * 2;

      const maxPhi = (0.42 - 0.13 * Math.cos(theta)) * Math.PI;
      const phi = v * maxPhi;

      let partIndent = 0;
      if (Math.abs(Math.sin(theta)) < 0.12 && Math.cos(theta) > 0 && v < 0.70) {
        partIndent = 0.0035 * (1.0 - Math.abs(Math.sin(theta)) / 0.12);
      }

      const wave = 0.003 * Math.cos(theta * 3.0) * Math.sin(phi);
      const hairThick = 0.009 + wave - partIndent;

      let px = Math.sin(theta) * Math.sin(phi) * (rx + hairThick);
      let py = skullY + Math.cos(phi) * (ry + hairThick);
      let pz = skullZ + Math.cos(theta) * Math.sin(phi) * (rz + hairThick);

      if (v > 0.35) {
        const pull = (v - 0.35) * 0.026;
        pz -= pull;
      }

      positions.push(px, py, pz);
      uvs.push(u, v);
    }
    capStarts.push(start);
  }

  for (let r = 0; r < rings; r++) {
    const cur = capStarts[r];
    const next = capStarts[r + 1];
    for (let s = 0; s < slices; s++) {
      indices.push(cur + s, next + s, cur + s + 1);
      indices.push(cur + s + 1, next + s, next + s + 1);
    }
  }

  // Low Bun / Chignon at nape of neck
  const bunTorus = new THREE.TorusGeometry(0.026, 0.012, 10, 20);
  bunTorus.rotateX(Math.PI * 0.45);
  bunTorus.translate(0, 1.535, -0.078);
  const btPos = bunTorus.attributes.position.array;
  const btIdx = bunTorus.index.array;
  const btStart = positions.length / 3;

  for (let i = 0; i < btPos.length; i += 3) {
    positions.push(btPos[i], btPos[i + 1], btPos[i + 2]);
    uvs.push(0.5, 0.5);
  }
  for (let i = 0; i < btIdx.length; i++) {
    indices.push(btIdx[i] + btStart);
  }

  // Hair tie band
  const band = new THREE.TorusGeometry(0.022, 0.005, 8, 16);
  band.rotateX(Math.PI * 0.45);
  band.translate(0, 1.545, -0.068);
  const bPos = band.attributes.position.array;
  const bIdx = band.index.array;
  const bStart = positions.length / 3;

  for (let i = 0; i < bPos.length; i += 3) {
    positions.push(bPos[i], bPos[i + 1], bPos[i + 2]);
    uvs.push(0.5, 0.5);
  }
  for (let i = 0; i < bIdx.length; i++) {
    indices.push(bIdx[i] + bStart);
  }

  // Flowing ponytail gather
  const tailRings = [
    { y: 1.52, x: 0.0, z: -0.078, r: 0.020 },
    { y: 1.47, x: 0.0, z: -0.088, r: 0.022 },
    { y: 1.42, x: 0.0, z: -0.092, r: 0.018 },
    { y: 1.37, x: 0.0, z: -0.088, r: 0.014 },
    { y: 1.33, x: 0.0, z: -0.082, r: 0.007 },
  ];
  const tSlices = 16;
  const tStarts = [];

  for (let r = 0; r < tailRings.length; r++) {
    const ring = tailRings[r];
    const start = positions.length / 3;
    for (let s = 0; s <= tSlices; s++) {
      const theta = (s / tSlices) * Math.PI * 2;
      positions.push(ring.x + Math.sin(theta) * ring.r, ring.y, ring.z + Math.cos(theta) * ring.r);
      uvs.push(s / tSlices, r / (tailRings.length - 1));
    }
    tStarts.push(start);
  }

  for (let r = 0; r < tailRings.length - 1; r++) {
    const cur = tStarts[r];
    const next = tStarts[r + 1];
    for (let s = 0; s < tSlices; s++) {
      indices.push(cur + s, next + s, cur + s + 1);
      indices.push(cur + s + 1, next + s, next + s + 1);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  const skinIndices = [];
  const skinWeights = [];
  for (let i = 0; i < positions.length / 3; i++) {
    skinIndices.push(JOINTS.Head, 0, 0, 0);
    skinWeights.push(1.0, 0, 0, 0);
  }
  return applySkinningBuffers(geom, skinIndices, skinWeights);
}

// ── 8. Doctor PBR Materials ───────────────────────────────────
export function getDoctorMaterials(badgeTexture) {
  return {
    coat: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#F8FAFC"),
      roughness: 0.55,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
    scrubs: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0E595E"), // Deep rich teal matching hospital scrubs standard
      roughness: 0.70,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
    sneakers: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#F3F4F6"),
      roughness: 0.40,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
    stethoscope: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1A1D20"),
      roughness: 0.35,
      metalness: 0.55,
      side: THREE.DoubleSide,
    }),
    idBadge: new THREE.MeshStandardMaterial({
      map: badgeTexture || null,
      roughness: 0.25,
      metalness: 0.1,
      transparent: false,
      side: THREE.DoubleSide,
    }),
    hair: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#161311"),
      roughness: 0.42,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
  };
}

// ── 9. Interactive 3D Anatomical Raycast Targets ───────────────
export const BODY_MAP_REGIONS = [
  { id: "head", label: "Head & Neck", position: [0, 1.58, 0], radius: 0.14, symptoms: ["Headache", "Dizziness", "Sore throat"] },
  { id: "chest", label: "Chest & Heart", position: [0, 1.30, 0.05], size: [0.32, 0.22, 0.20], symptoms: ["Chest pain", "Shortness of breath", "Cough"] },
  { id: "abdomen", label: "Abdomen", position: [0, 1.08, 0.05], size: [0.30, 0.18, 0.18], symptoms: ["Stomach ache", "Nausea", "Acid reflux"] },
  { id: "left_arm", label: "Left Arm", position: [0.26, 1.20, 0], size: [0.12, 0.40, 0.12], symptoms: ["Shoulder pain", "Arm numbness", "Joint stiffness"] },
  { id: "right_arm", label: "Right Arm", position: [-0.26, 1.20, 0], size: [0.12, 0.40, 0.12], symptoms: ["Shoulder pain", "Arm numbness", "Joint stiffness"] },
  { id: "legs", label: "Legs & Joints", position: [0, 0.50, 0], size: [0.34, 0.70, 0.24], symptoms: ["Knee pain", "Leg swelling", "Muscle cramps"] },
];
