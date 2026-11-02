// Sanjeevni AI — Doctor Wardrobe & Anatomy Definition
// Precision-Modeled 3D Medical Garments with Native Mixamo 67-Bone Linear Blend Skinning

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

// ── 1. Physician Lab Coat Geometry ─────────────────────────────
// Symmetrical open front, notched lapels, mid-thigh hem, structured sleeves & pockets
export function createLabCoatGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  // Torso cross-section rings
  const rings = [
    { y: 1.48, xc: 0.0, zc: -0.015, rx: 0.082, rz: 0.088, gap: 0.030 }, // Collar top
    { y: 1.44, xc: 0.0, zc: -0.008, rx: 0.125, rz: 0.098, gap: 0.034 }, // Shoulders
    { y: 1.38, xc: 0.0, zc: 0.005,  rx: 0.155, rz: 0.108, gap: 0.038, lapelWidth: 0.032 }, // Upper chest
    { y: 1.32, xc: 0.0, zc: 0.010,  rx: 0.160, rz: 0.112, gap: 0.042, lapelWidth: 0.038 }, // Notched lapel
    { y: 1.25, xc: 0.0, zc: 0.015,  rx: 0.152, rz: 0.108, gap: 0.045, lapelWidth: 0.030 }, // Mid chest
    { y: 1.18, xc: 0.0, zc: 0.020,  rx: 0.144, rz: 0.102, gap: 0.048 }, // Lower chest
    { y: 1.12, xc: 0.0, zc: 0.024,  rx: 0.140, rz: 0.098, gap: 0.052 }, // Waist
    { y: 1.05, xc: 0.0, zc: 0.028,  rx: 0.152, rz: 0.105, gap: 0.056 }, // Upper hip
    { y: 0.98, xc: 0.0, zc: 0.030,  rx: 0.166, rz: 0.112, gap: 0.060 }, // Hip line
    { y: 0.90, xc: 0.0, zc: 0.026,  rx: 0.176, rz: 0.116, gap: 0.064 }, // Upper thigh
    { y: 0.82, xc: 0.0, zc: 0.020,  rx: 0.185, rz: 0.119, gap: 0.068 }, // Mid thigh
    { y: 0.74, xc: 0.0, zc: 0.015,  rx: 0.192, rz: 0.122, gap: 0.072 }, // Lower thigh
    { y: 0.68, xc: 0.0, zc: 0.010,  rx: 0.196, rz: 0.124, gap: 0.076 }, // Mid-thigh hemline
  ];

  const numSlices = 28;
  const ringVertCounts = [];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const vertStart = positions.length / 3;

    const minTheta = Math.asin(Math.min(0.85, ring.gap / ring.rx));
    const maxTheta = 2 * Math.PI - minTheta;

    for (let s = 0; s <= numSlices; s++) {
      const t = s / numSlices;
      const theta = minTheta + t * (maxTheta - minTheta);

      let px = ring.xc + Math.sin(theta) * ring.rx;
      let pz = ring.zc + Math.cos(theta) * ring.rz;
      let py = ring.y;

      // Realistic lapel fold flare on left and right front edges
      if (ring.lapelWidth && (s < 3 || s > numSlices - 3)) {
        pz += ring.lapelWidth;
        if (s < 3) px += ring.lapelWidth * 0.35;
        else px -= ring.lapelWidth * 0.35;
      }

      positions.push(px, py, pz);
      uvs.push(t, r / (rings.length - 1));
    }
    ringVertCounts.push({ start: vertStart, count: numSlices + 1 });
  }

  for (let r = 0; r < rings.length - 1; r++) {
    const cur = ringVertCounts[r];
    const next = ringVertCounts[r + 1];

    for (let s = 0; s < numSlices; s++) {
      const i0 = cur.start + s;
      const i1 = cur.start + s + 1;
      const i2 = next.start + s + 1;
      const i3 = next.start + s;

      indices.push(i0, i3, i1);
      indices.push(i1, i3, i2);
    }
  }

  // Sleeves following the arms naturally
  function createSleeve(isLeft) {
    const sign = isLeft ? 1 : -1;
    const sleeveRings = [
      { y: 1.44, x: sign * 0.126, z: -0.015, r: 0.052 },
      { y: 1.38, x: sign * 0.170, z: -0.020, r: 0.048 },
      { y: 1.32, x: sign * 0.220, z: -0.025, r: 0.044 },
      { y: 1.25, x: sign * 0.270, z: -0.028, r: 0.041 },
      { y: 1.18, x: sign * 0.315, z: 0.000,  r: 0.039 },
      { y: 1.11, x: sign * 0.355, z: 0.035,  r: 0.037 },
      { y: 1.05, x: sign * 0.390, z: 0.065,  r: 0.036 }, // Wrist cuff
    ];

    const sleeveSlices = 14;
    const sleeveVertCounts = [];

    for (let r = 0; r < sleeveRings.length; r++) {
      const ring = sleeveRings[r];
      const start = positions.length / 3;

      for (let s = 0; s <= sleeveSlices; s++) {
        const phi = (s / sleeveSlices) * Math.PI * 2;
        const px = ring.x + Math.cos(phi) * ring.r * 0.85;
        const py = ring.y + Math.sin(phi) * ring.r * 0.85 * 0.7;
        const pz = ring.z + Math.sin(phi) * ring.r;

        positions.push(px, py, pz);
        uvs.push(s / sleeveSlices, r / (sleeveRings.length - 1));
      }
      sleeveVertCounts.push({ start, count: sleeveSlices + 1 });
    }

    for (let r = 0; r < sleeveRings.length - 1; r++) {
      const cur = sleeveVertCounts[r];
      const next = sleeveVertCounts[r + 1];
      for (let s = 0; s < sleeveSlices; s++) {
        const i0 = cur.start + s;
        const i1 = cur.start + s + 1;
        const i2 = next.start + s + 1;
        const i3 = next.start + s;
        indices.push(i0, isLeft ? i3 : i1, isLeft ? i1 : i3);
        indices.push(isLeft ? i1 : i3, isLeft ? i3 : i1, i2);
      }
    }
  }

  createSleeve(true);  // Left sleeve
  createSleeve(false); // Right sleeve

  // 3D Pockets
  function createPatchPocket(xMin, xMax, yMin, yMax, zBase) {
    const start = positions.length / 3;
    const zOut = zBase + 0.007;
    positions.push(xMin, yMin, zOut, xMax, yMin, zOut, xMax, yMax, zOut, xMin, yMax, zOut);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  createPatchPocket(0.06, 0.12, 1.25, 1.33, 0.118); // Upper chest pocket
  createPatchPocket(0.07, 0.16, 0.75, 0.88, 0.126); // Lower left patch pocket
  createPatchPocket(-0.16, -0.07, 0.75, 0.88, 0.126); // Lower right patch pocket

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  return attachSkinning(geom, (x, y, z) => {
    if (Math.abs(x) > 0.18 && y > 1.02) {
      const isLeft = x > 0;
      const sh = isLeft ? JOINTS.LeftShoulder : JOINTS.RightShoulder;
      const arm = isLeft ? JOINTS.LeftArm : JOINTS.RightArm;
      const fa = isLeft ? JOINTS.LeftForeArm : JOINTS.RightForeArm;

      if (y > 1.32) {
        const t = (y - 1.32) / (1.45 - 1.32);
        return { indices: [sh, arm, 0, 0], weights: [t, 1 - t, 0, 0] };
      } else if (y > 1.16) {
        const t = (y - 1.16) / (1.32 - 1.16);
        return { indices: [arm, fa, 0, 0], weights: [t, 1 - t, 0, 0] };
      } else {
        return { indices: [fa, 0, 0, 0], weights: [1.0, 0, 0, 0] };
      }
    }

    if (y >= 1.40) {
      const t = Math.min(1.0, (y - 1.40) / 0.08);
      return { indices: [JOINTS.Neck, JOINTS.Spine2, 0, 0], weights: [t * 0.7, 1.0 - t * 0.7, 0, 0] };
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
      const t = Math.max(0, (y - 0.68) / (0.98 - 0.68));
      const legJoint = x >= 0 ? JOINTS.LeftUpLeg : JOINTS.RightUpLeg;
      return {
        indices: [JOINTS.Hips, legJoint, 0, 0],
        weights: [0.35 + 0.65 * t, (1.0 - t) * 0.65, 0, 0],
      };
    }
  });
}

// ── 2. Teal Medical Scrub Top Geometry ─────────────────────────
export function createScrubTopGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  const rings = [
    { y: 1.45, rx: 0.090, rz: 0.082, vNotch: 0.0 },
    { y: 1.40, rx: 0.134, rz: 0.093, vNotch: 0.028 },
    { y: 1.34, rx: 0.152, rz: 0.101, vNotch: 0.050 }, // V-neck apex
    { y: 1.28, rx: 0.148, rz: 0.099 },
    { y: 1.20, rx: 0.138, rz: 0.093 },
    { y: 1.12, rx: 0.136, rz: 0.090 },
    { y: 1.05, rx: 0.146, rz: 0.096 },
    { y: 0.98, rx: 0.158, rz: 0.102 },
  ];

  const slices = 24;
  const ringStarts = [];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const start = positions.length / 3;

    for (let s = 0; s <= slices; s++) {
      const theta = (s / slices) * Math.PI * 2;
      let px = Math.sin(theta) * ring.rx;
      let pz = Math.cos(theta) * ring.rz;
      let py = ring.y;

      // Realistic V-neck collar plunge at the front
      if (ring.vNotch && Math.cos(theta) > 0.65) {
        py -= ring.vNotch * (Math.cos(theta) - 0.65) * 2.8;
      }

      positions.push(px, py, pz);
      uvs.push(s / slices, r / (rings.length - 1));
    }
    ringStarts.push(start);
  }

  for (let r = 0; r < rings.length - 1; r++) {
    const cur = ringStarts[r];
    const next = ringStarts[r + 1];
    for (let s = 0; s < slices; s++) {
      indices.push(cur + s, next + s, cur + s + 1);
      indices.push(cur + s + 1, next + s, next + s + 1);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  return attachSkinning(geom, (x, y, z) => {
    if (y >= 1.34) {
      const t = Math.min(1.0, (y - 1.34) / 0.11);
      return { indices: [JOINTS.Neck, JOINTS.Spine2, 0, 0], weights: [t * 0.4, 1.0 - t * 0.4, 0, 0] };
    } else if (y >= 1.20) {
      const t = (y - 1.20) / 0.14;
      return { indices: [JOINTS.Spine2, JOINTS.Spine1, 0, 0], weights: [t, 1 - t, 0, 0] };
    } else if (y >= 1.08) {
      const t = (y - 1.08) / 0.12;
      return { indices: [JOINTS.Spine1, JOINTS.Spine, 0, 0], weights: [t, 1 - t, 0, 0] };
    } else {
      const t = (y - 0.98) / 0.10;
      return { indices: [JOINTS.Spine, JOINTS.Hips, 0, 0], weights: [t, 1 - t, 0, 0] };
    }
  });
}

// ── 3. Teal Medical Scrub Trousers Geometry ────────────────────
export function createScrubTrousersGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  function createLeg(isLeft) {
    const sign = isLeft ? 1 : -1;
    const rings = [
      { y: 1.02, x: sign * 0.085, z: 0.040, rx: 0.083, rz: 0.081 },
      { y: 0.92, x: sign * 0.095, z: 0.038, rx: 0.079, rz: 0.077 },
      { y: 0.80, x: sign * 0.105, z: 0.032, rx: 0.073, rz: 0.071 },
      { y: 0.68, x: sign * 0.115, z: 0.026, rx: 0.067, rz: 0.065 },
      { y: 0.57, x: sign * 0.125, z: 0.021, rx: 0.063, rz: 0.061 }, // Knee
      { y: 0.46, x: sign * 0.135, z: 0.005, rx: 0.059, rz: 0.057 },
      { y: 0.35, x: sign * 0.142, z: -0.012, rx: 0.056, rz: 0.055 },
      { y: 0.24, x: sign * 0.150, z: -0.025, rx: 0.055, rz: 0.053 },
      { y: 0.14, x: sign * 0.155, z: -0.035, rx: 0.054, rz: 0.052 }, // Ankle
    ];

    const slices = 16;
    const ringStarts = [];

    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      const start = positions.length / 3;

      for (let s = 0; s <= slices; s++) {
        const theta = (s / slices) * Math.PI * 2;
        const px = ring.x + Math.sin(theta) * ring.rx;
        const pz = ring.z + Math.cos(theta) * ring.rz;
        const py = ring.y;

        positions.push(px, py, pz);
        uvs.push(s / slices, r / (rings.length - 1));
      }
      ringStarts.push(start);
    }

    for (let r = 0; r < rings.length - 1; r++) {
      const cur = ringStarts[r];
      const next = ringStarts[r + 1];
      for (let s = 0; s < slices; s++) {
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

  return attachSkinning(geom, (x, y, z) => {
    const isLeft = x >= 0;
    const upLeg = isLeft ? JOINTS.LeftUpLeg : JOINTS.RightUpLeg;
    const leg = isLeft ? JOINTS.LeftLeg : JOINTS.RightLeg;
    const foot = isLeft ? JOINTS.LeftFoot : JOINTS.RightFoot;

    if (y >= 0.95) {
      const t = (y - 0.95) / (1.02 - 0.95);
      return { indices: [JOINTS.Hips, upLeg, 0, 0], weights: [t * 0.7, 1 - t * 0.7, 0, 0] };
    } else if (y >= 0.65) {
      const t = (y - 0.65) / 0.30;
      return { indices: [upLeg, leg, 0, 0], weights: [0.75 + 0.25 * t, (1 - t) * 0.25, 0, 0] };
    } else if (y >= 0.50) {
      const t = (y - 0.50) / 0.15;
      return { indices: [upLeg, leg, 0, 0], weights: [t * 0.5, 1 - t * 0.5, 0, 0] };
    } else if (y >= 0.22) {
      return { indices: [leg, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    } else {
      const t = (y - 0.14) / (0.22 - 0.14);
      return { indices: [leg, foot, 0, 0], weights: [0.8 + 0.2 * t, (1 - t) * 0.2, 0, 0] };
    }
  });
}

// ── 4. White Medical Athletic Sneakers Geometry ────────────────
export function createSneakersGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  function createShoe(isLeft) {
    const sign = isLeft ? 1 : -1;
    const cx = sign * 0.155;

    const rings = [
      { y: 0.000, rx: 0.052, zc: 0.050, rz: 0.135 },
      { y: 0.020, rx: 0.054, zc: 0.050, rz: 0.138 },
      { y: 0.038, rx: 0.050, zc: 0.050, rz: 0.132 },
      { y: 0.065, rx: 0.046, zc: 0.045, rz: 0.120 },
      { y: 0.095, rx: 0.042, zc: 0.035, rz: 0.100 },
      { y: 0.125, rx: 0.038, zc: 0.015, rz: 0.075 },
    ];

    const slices = 16;
    const ringStarts = [];

    for (let r = 0; r < rings.length; r++) {
      const ring = rings[r];
      const start = positions.length / 3;

      for (let s = 0; s <= slices; s++) {
        const theta = (s / slices) * Math.PI * 2;
        let px = cx + Math.sin(theta) * ring.rx;
        let pz = ring.zc + Math.cos(theta) * ring.rz;
        let py = ring.y;

        if (pz > 0.10) {
          py += (pz - 0.10) * 0.22;
        }

        positions.push(px, py, pz);
        uvs.push(s / slices, r / (rings.length - 1));
      }
      ringStarts.push(start);
    }

    for (let r = 0; r < rings.length - 1; r++) {
      const cur = ringStarts[r];
      const next = ringStarts[r + 1];
      for (let s = 0; s < slices; s++) {
        indices.push(cur + s, isLeft ? next + s : cur + s + 1, isLeft ? cur + s + 1 : next + s);
        indices.push(cur + s + 1, isLeft ? next + s : next + s + 1, isLeft ? next + s + 1 : next + s);
      }
    }
  }

  createShoe(true);
  createShoe(false);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  return attachSkinning(geom, (x, y, z) => {
    const isLeft = x >= 0;
    const foot = isLeft ? JOINTS.LeftFoot : JOINTS.RightFoot;
    const toe = isLeft ? JOINTS.LeftToeBase : JOINTS.RightToeBase;

    if (z <= 0.06) {
      return { indices: [foot, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    } else if (z <= 0.11) {
      const t = (z - 0.06) / 0.05;
      return { indices: [foot, toe, 0, 0], weights: [1 - t * 0.7, t * 0.7, 0, 0] };
    } else {
      return { indices: [toe, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    }
  });
}

// ── 5. Medical Stethoscope Geometry ────────────────────────────
export function createStethoscopeGeometry() {
  const curvePoints = [
    new THREE.Vector3(0.045, 1.48, -0.05),
    new THREE.Vector3(0.075, 1.44, -0.01),
    new THREE.Vector3(0.062, 1.35, 0.08),
    new THREE.Vector3(0.020, 1.27, 0.125),
    new THREE.Vector3(-0.062, 1.35, 0.08),
    new THREE.Vector3(-0.075, 1.44, -0.01),
    new THREE.Vector3(-0.045, 1.48, -0.05),
  ];

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const tubeGeom = new THREE.TubeGeometry(curve, 32, 0.006, 8, false);

  const chestPiece = new THREE.CylinderGeometry(0.024, 0.024, 0.009, 16);
  chestPiece.rotateX(Math.PI / 2);
  chestPiece.translate(0.020, 1.27, 0.132);

  const p1 = tubeGeom.attributes.position.array;
  const p2 = chestPiece.attributes.position.array;
  const i1 = tubeGeom.index.array;
  const i2 = chestPiece.index.array;

  const mergedPos = new Float32Array(p1.length + p2.length);
  mergedPos.set(p1, 0);
  mergedPos.set(p2, p1.length);

  const offset = p1.length / 3;
  const mergedIdx = new Uint16Array(i1.length + i2.length);
  mergedIdx.set(i1, 0);
  for (let k = 0; k < i2.length; k++) {
    mergedIdx[i1.length + k] = i2[k] + offset;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(mergedPos, 3));
  geom.setIndex(new THREE.BufferAttribute(mergedIdx, 1));

  return attachSkinning(geom, (x, y, z) => {
    if (y >= 1.42) {
      return { indices: [JOINTS.Neck, JOINTS.Spine2, 0, 0], weights: [0.65, 0.35, 0, 0] };
    } else {
      return { indices: [JOINTS.Spine2, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    }
  });
}

// ── 6. Hospital Identification Badge Geometry ──────────────────
export function createIDBadgeGeometry() {
  const geom = new THREE.PlaneGeometry(0.055, 0.075);
  geom.translate(0.090, 1.295, 0.130);

  return attachSkinning(geom, () => {
    return { indices: [JOINTS.Spine2, 0, 0, 0], weights: [1.0, 0, 0, 0] };
  });
}

// ── 7. Ponytail Hair Tie & Gather Geometry ─────────────────────
// Sleek gathered hair knot & tied ponytail at the back of the head
export function createPonytailHairGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  // Hair tie knot band at back of the head
  const band = new THREE.TorusGeometry(0.025, 0.007, 8, 16);
  band.rotateX(Math.PI / 2);
  band.translate(0, 1.57, -0.095);

  // Ponytail hair tail extending naturally down
  const tailRings = [
    { y: 1.57, x: 0.0, z: -0.095, r: 0.022 },
    { y: 1.51, x: 0.0, z: -0.110, r: 0.024 },
    { y: 1.45, x: 0.0, z: -0.118, r: 0.020 },
    { y: 1.39, x: 0.0, z: -0.120, r: 0.015 },
    { y: 1.33, x: 0.0, z: -0.115, r: 0.008 },
  ];

  const tailSlices = 12;
  const tailStarts = [];

  for (let r = 0; r < tailRings.length; r++) {
    const ring = tailRings[r];
    const start = positions.length / 3;

    for (let s = 0; s <= tailSlices; s++) {
      const theta = (s / tailSlices) * Math.PI * 2;
      const px = ring.x + Math.sin(theta) * ring.r;
      const pz = ring.z + Math.cos(theta) * ring.r;
      const py = ring.y;

      positions.push(px, py, pz);
      uvs.push(s / tailSlices, r / (tailRings.length - 1));
    }
    tailStarts.push(start);
  }

  for (let r = 0; r < tailRings.length - 1; r++) {
    const cur = tailStarts[r];
    const next = tailStarts[r + 1];
    for (let s = 0; s < tailSlices; s++) {
      indices.push(cur + s, cur + s + 1, next + s);
      indices.push(cur + s + 1, next + s + 1, next + s);
    }
  }

  // Merge band vertices
  const bPos = band.attributes.position.array;
  const bIdx = band.index.array;
  const curVerts = positions.length / 3;

  for (let i = 0; i < bPos.length; i += 3) {
    positions.push(bPos[i], bPos[i + 1], bPos[i + 2]);
    uvs.push(0.5, 0.5);
  }
  for (let i = 0; i < bIdx.length; i++) {
    indices.push(bIdx[i] + curVerts);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  return attachSkinning(geom, (x, y, z) => {
    if (y >= 1.48) {
      return { indices: [JOINTS.Head, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    } else {
      const t = (y - 1.33) / (1.48 - 1.33);
      return { indices: [JOINTS.Head, JOINTS.Neck, 0, 0], weights: [t, 1 - t, 0, 0] };
    }
  });
}

// ── 8. Doctor PBR Materials ───────────────────────────────────
export function getDoctorMaterials(badgeTexture) {
  return {
    coat: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#FFFFFF"),
      roughness: 0.40,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
    scrubs: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#0E595E"),
      roughness: 0.65,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
    sneakers: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#F8FAFC"),
      roughness: 0.38,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
    stethoscope: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1E293B"),
      roughness: 0.45,
      metalness: 0.3,
      side: THREE.DoubleSide,
    }),
    idBadge: new THREE.MeshStandardMaterial({
      map: badgeTexture || null,
      color: new THREE.Color("#FFFFFF"),
      roughness: 0.25,
      metalness: 0.05,
      side: THREE.DoubleSide,
      transparent: true,
    }),
    hair: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#181513"),
      roughness: 0.58,
      metalness: 0.03,
      side: THREE.DoubleSide,
    }),
  };
}

// ── 9. Dedicated Anatomical Raycast Target Zones ───────────────
export const BODY_MAP_REGIONS = [
  { id: "head", label: "Head & Neck", position: [0, 1.62, 0.02], radius: 0.14, symptoms: ["Headache", "Dizziness", "Fever", "Fatigue", "Ear Pain", "Sore Throat"] },
  { id: "chest", label: "Chest & Heart", position: [0, 1.35, 0.04], size: [0.32, 0.22, 0.20], symptoms: ["Chest Pain", "Shortness of Breath", "Cough", "Heart Palpitations", "Tightness"] },
  { id: "abdomen", label: "Abdomen & Digestive", position: [0, 1.14, 0.04], size: [0.30, 0.20, 0.18], symptoms: ["Stomach Pain", "Nausea", "Vomiting", "Indigestion", "Abdominal Cramps"] },
  { id: "left_arm", label: "Left Arm & Shoulder", position: [0.26, 1.25, 0.0], size: [0.12, 0.38, 0.12], symptoms: ["Arm Pain", "Shoulder Pain", "Joint Stiffness", "Numbness", "Weakness"] },
  { id: "right_arm", label: "Right Arm & Shoulder", position: [-0.26, 1.25, 0.0], size: [0.12, 0.38, 0.12], symptoms: ["Arm Pain", "Shoulder Pain", "Joint Stiffness", "Numbness", "Weakness"] },
  { id: "legs", label: "Legs & Joints", position: [0, 0.55, 0.0], size: [0.34, 0.70, 0.22], symptoms: ["Knee Pain", "Leg Swelling", "Joint Stiffness", "Muscle Cramps", "Ankle Pain"] },
];
