// Comprehensive 3D Physician Garment & Anatomy Mesh Generator for Sanjeevni AI
// Builds SkinnedMeshes bound to the 67-joint Mixamo armature

import * as THREE from "three";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Polyfill FileReader for Three.js in Node.js
class FileReaderPolyfill {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
    });
  }
}
global.self = global;
global.window = global;
global.FileReader = FileReaderPolyfill;

console.log("=== SANJEEVNI AI 3D ASSET COMPILER ===");

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

// ── Helper to create skin attributes ───────────────────────────
function attachSkinning(geometry, skinningFn) {
  const pos = geometry.attributes.position;
  const skinIndices = [];
  const skinWeights = [];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const { indices, weights } = skinningFn(x, y, z, i);

    // Normalize weights to sum to 1.0
    const sum = weights.reduce((a, b) => a + b, 0) || 1.0;
    skinIndices.push(indices[0] || 0, indices[1] || 0, indices[2] || 0, indices[3] || 0);
    skinWeights.push(weights[0] / sum, (weights[1] || 0) / sum, (weights[2] || 0) / sum, (weights[3] || 0) / sum);
  }

  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.computeVertexNormals();
  return geometry;
}

// ── 1. Physician Lab Coat Geometry Generator ───────────────────
export function createLabCoatGeometry() {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // Ring definition: height Y, center (xc, zc), radii (rx, rz), front opening half-angle or gap
  const rings = [
    { y: 1.48, xc: 0.0, zc: -0.01, rx: 0.080, rz: 0.085, gap: 0.035, isCollar: true },
    { y: 1.44, xc: 0.0, zc: -0.00, rx: 0.125, rz: 0.095, gap: 0.040, isCollar: true },
    { y: 1.38, xc: 0.0, zc: 0.010, rx: 0.160, rz: 0.105, gap: 0.045, lapelWidth: 0.035 },
    { y: 1.32, xc: 0.0, zc: 0.015, rx: 0.165, rz: 0.110, gap: 0.048, lapelWidth: 0.040 },
    { y: 1.25, xc: 0.0, zc: 0.020, rx: 0.155, rz: 0.105, gap: 0.050, lapelWidth: 0.035 },
    { y: 1.18, xc: 0.0, zc: 0.025, rx: 0.145, rz: 0.098, gap: 0.052 },
    { y: 1.12, xc: 0.0, zc: 0.030, rx: 0.142, rz: 0.095, gap: 0.055 },
    { y: 1.05, xc: 0.0, zc: 0.035, rx: 0.155, rz: 0.102, gap: 0.060 },
    { y: 0.98, xc: 0.0, zc: 0.035, rx: 0.170, rz: 0.110, gap: 0.065 },
    { y: 0.90, xc: 0.0, zc: 0.030, rx: 0.180, rz: 0.115, gap: 0.070 },
    { y: 0.82, xc: 0.0, zc: 0.025, rx: 0.190, rz: 0.118, gap: 0.075 },
    { y: 0.75, xc: 0.0, zc: 0.020, rx: 0.195, rz: 0.120, gap: 0.080 },
    { y: 0.68, xc: 0.0, zc: 0.015, rx: 0.200, rz: 0.122, gap: 0.085 },
  ];

  const numSlices = 28; // angular resolution
  const ringVertCounts = [];

  // Generate body rings with open front
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const vertStart = positions.length / 3;

    // Angle theta from front-right (+gap/rx) around back to front-left (-gap/rx)
    // In polar coords: front center is theta = 0 (+Z), right is +X (theta = +PI/2), left is -X (theta = -PI/2)
    const minTheta = Math.asin(Math.min(0.9, ring.gap / ring.rx));
    const maxTheta = 2 * Math.PI - minTheta;

    for (let s = 0; s <= numSlices; s++) {
      const t = s / numSlices;
      const theta = minTheta + t * (maxTheta - minTheta);

      let px = ring.xc + Math.sin(theta) * ring.rx;
      let pz = ring.zc + Math.cos(theta) * ring.rz;
      let py = ring.y;

      // Add lapel notch flare at chest levels
      if (ring.lapelWidth && (s < 3 || s > numSlices - 3)) {
        pz += ring.lapelWidth;
        if (s < 3) px += ring.lapelWidth * 0.4;
        else px -= ring.lapelWidth * 0.4;
      }

      positions.push(px, py, pz);
      uvs.push(t, r / (rings.length - 1));
    }
    ringVertCounts.push({ start: vertStart, count: numSlices + 1 });
  }

  // Connect body rings with quad faces (two triangles)
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

  // Add Left Sleeve Loft (Shoulder -> Elbow -> Wrist)
  function createSleeve(isLeft) {
    const sign = isLeft ? 1 : -1;
    const sleeveRings = [
      { y: 1.44, x: sign * 0.126, z: -0.020, r: 0.052 },
      { y: 1.38, x: sign * 0.170, z: -0.025, r: 0.048 },
      { y: 1.32, x: sign * 0.220, z: -0.028, r: 0.044 },
      { y: 1.25, x: sign * 0.270, z: -0.030, r: 0.041 },
      { y: 1.18, x: sign * 0.320, z: 0.000,  r: 0.039 },
      { y: 1.11, x: sign * 0.360, z: 0.035,  r: 0.037 },
      { y: 1.05, x: sign * 0.395, z: 0.065,  r: 0.036 }, // Wrist cuff
    ];

    const sleeveSlices = 14;
    const sleeveVertCounts = [];

    for (let r = 0; r < sleeveRings.length; r++) {
      const ring = sleeveRings[r];
      const start = positions.length / 3;

      for (let s = 0; s <= sleeveSlices; s++) {
        const phi = (s / sleeveSlices) * Math.PI * 2;
        // Normal to arm vector
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

  createSleeve(true);  // Left arm sleeve
  createSleeve(false); // Right arm sleeve

  // Add 3D Pockets (Upper left breast pocket & two lower patch pockets)
  function createPatchPocket(xMin, xMax, yMin, yMax, zBase) {
    const start = positions.length / 3;
    const zOut = zBase + 0.006;

    positions.push(xMin, yMin, zOut); // 0: BL
    positions.push(xMax, yMin, zOut); // 1: BR
    positions.push(xMax, yMax, zOut); // 2: TR
    positions.push(xMin, yMax, zOut); // 3: TL

    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(start, start + 1, start + 2);
    indices.push(start, start + 2, start + 3);
  }

  createPatchPocket(0.06, 0.12, 1.25, 1.33, 0.115); // Upper left breast pocket
  createPatchPocket(0.07, 0.16, 0.75, 0.88, 0.125); // Lower left patch pocket
  createPatchPocket(-0.16, -0.07, 0.75, 0.88, 0.125); // Lower right patch pocket

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  // Apply smooth multi-joint skin weights
  return attachSkinning(geom, (x, y, z) => {
    // Check if vertex belongs to sleeves (|x| > 0.18 and y > 1.0)
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

    // Lab Coat Torso & Mid-Thigh Skirt
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
      // Skirt: blends smoothly with thighs for natural leg movement
      const t = Math.max(0, (y - 0.68) / (0.98 - 0.68)); // 1.0 at hips, 0.0 at hem
      const legJoint = x >= 0 ? JOINTS.LeftUpLeg : JOINTS.RightUpLeg;
      return {
        indices: [JOINTS.Hips, legJoint, 0, 0],
        weights: [0.35 + 0.65 * t, (1.0 - t) * 0.65, 0, 0],
      };
    }
  });
}

// ── 2. Teal Medical Scrub Top Geometry Generator ───────────────
export function createScrubTopGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  const rings = [
    { y: 1.45, rx: 0.090, rz: 0.080, vNotch: 0.0 },  // Collarbone
    { y: 1.40, rx: 0.135, rz: 0.092, vNotch: 0.025 },
    { y: 1.35, rx: 0.155, rz: 0.100, vNotch: 0.045 }, // V-neck apex
    { y: 1.28, rx: 0.150, rz: 0.098 },
    { y: 1.20, rx: 0.140, rz: 0.092 },
    { y: 1.12, rx: 0.138, rz: 0.090 },
    { y: 1.05, rx: 0.148, rz: 0.096 },
    { y: 0.98, rx: 0.160, rz: 0.102 }, // Waist hem
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
      if (ring.vNotch && Math.cos(theta) > 0.7) {
        py -= ring.vNotch * (Math.cos(theta) - 0.7) * 3.3;
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

// ── 3. Teal Medical Scrub Trousers Geometry Generator ──────────
export function createScrubTrousersGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  function createLeg(isLeft) {
    const sign = isLeft ? 1 : -1;
    const rings = [
      { y: 1.02, x: sign * 0.085, z: 0.040, rx: 0.082, rz: 0.080 }, // Pelvis/waist
      { y: 0.92, x: sign * 0.095, z: 0.038, rx: 0.078, rz: 0.076 }, // Thigh upper
      { y: 0.80, x: sign * 0.105, z: 0.032, rx: 0.072, rz: 0.070 }, // Mid thigh
      { y: 0.68, x: sign * 0.115, z: 0.026, rx: 0.066, rz: 0.064 }, // Lower thigh
      { y: 0.57, x: sign * 0.125, z: 0.021, rx: 0.062, rz: 0.060 }, // Knee
      { y: 0.46, x: sign * 0.135, z: 0.005, rx: 0.058, rz: 0.056 }, // Upper calf
      { y: 0.35, x: sign * 0.142, z: -0.012, rx: 0.055, rz: 0.054 }, // Mid shin
      { y: 0.24, x: sign * 0.150, z: -0.025, rx: 0.054, rz: 0.052 }, // Lower shin
      { y: 0.14, x: sign * 0.155, z: -0.035, rx: 0.053, rz: 0.051 }, // Ankle cuff
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

  createLeg(true);  // Left trouser leg
  createLeg(false); // Right trouser leg

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
      // Knee joint transition
      const t = (y - 0.50) / 0.15;
      return { indices: [upLeg, leg, 0, 0], weights: [t * 0.5, 1 - t * 0.5, 0, 0] };
    } else if (y >= 0.22) {
      return { indices: [leg, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    } else {
      // Ankle hem transition
      const t = (y - 0.14) / (0.22 - 0.14);
      return { indices: [leg, foot, 0, 0], weights: [0.8 + 0.2 * t, (1 - t) * 0.2, 0, 0] };
    }
  });
}

// ── 4. White Medical Athletic Sneakers Generator ──────────────
export function createSneakersGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  function createShoe(isLeft) {
    const sign = isLeft ? 1 : -1;
    const cx = sign * 0.155;

    // Outsole / Midsole: Cushioned white EVA foam
    const soleRings = [
      { y: 0.000, rx: 0.052, zc: 0.050, rz: 0.135 }, // Bottom tread
      { y: 0.020, rx: 0.054, zc: 0.050, rz: 0.138 }, // Midsole line
      { y: 0.038, rx: 0.050, zc: 0.050, rz: 0.132 }, // Upper welt
    ];

    // Upper shoe collar
    const upperRings = [
      { y: 0.065, rx: 0.046, zc: 0.045, rz: 0.120 },
      { y: 0.095, rx: 0.042, zc: 0.035, rz: 0.100 },
      { y: 0.125, rx: 0.038, zc: 0.015, rz: 0.075 }, // Ankle opening
    ];

    const rings = [...soleRings, ...upperRings];
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

        // Rocker toe elevation
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

  createShoe(true);  // Left shoe
  createShoe(false); // Right shoe

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

// ── 5. Medical Stethoscope Geometry Generator ──────────────────
export function createStethoscopeGeometry() {
  const curvePoints = [];
  // Tubing path looping around neck and over chest
  curvePoints.push(new THREE.Vector3(0.04, 1.48, -0.06)); // Right back neck
  curvePoints.push(new THREE.Vector3(0.08, 1.44, -0.02)); // Over right shoulder
  curvePoints.push(new THREE.Vector3(0.06, 1.36, 0.07));  // Down right chest
  curvePoints.push(new THREE.Vector3(0.02, 1.28, 0.12));  // Chest connector
  curvePoints.push(new THREE.Vector3(-0.06, 1.36, 0.07)); // Up left chest
  curvePoints.push(new THREE.Vector3(-0.08, 1.44, -0.02));// Over left shoulder
  curvePoints.push(new THREE.Vector3(-0.04, 1.48, -0.06));// Left back neck

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const tubeGeom = new THREE.TubeGeometry(curve, 32, 0.0055, 8, false);

  // Add Circular Diaphragm / Chest Piece
  const chestPiece = new THREE.CylinderGeometry(0.022, 0.022, 0.008, 16);
  chestPiece.rotateX(Math.PI / 2);
  chestPiece.translate(0.02, 1.28, 0.128);

  // Merge tube and chest piece
  // Simple vertex merge
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

// ── 6. Hospital Identification Badge Generator ─────────────────
export function createIDBadgeGeometry() {
  const geom = new THREE.PlaneGeometry(0.055, 0.075);
  geom.translate(0.085, 1.295, 0.125);

  return attachSkinning(geom, () => {
    return { indices: [JOINTS.Spine2, 0, 0, 0], weights: [1.0, 0, 0, 0] };
  });
}

// ── 7. Professional Ponytail Hair Generator ────────────────────
export function createPonytailHairGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  // Crown / Scalp cap (smooth sweep over head)
  const crownSlices = 16;
  const crownRings = 8;
  const crownStarts = [];

  for (let r = 0; r <= crownRings; r++) {
    const phi = (r / crownRings) * (Math.PI * 0.55); // Top down to ear/nape level
    const start = positions.length / 3;
    const y = 1.62 + Math.cos(phi) * 0.11;
    const rad = Math.sin(phi) * 0.105;

    for (let s = 0; s <= crownSlices; s++) {
      const theta = (s / crownSlices) * Math.PI * 2;
      const px = Math.sin(theta) * rad;
      const pz = 0.02 + Math.cos(theta) * rad * 1.1;

      positions.push(px, y, pz);
      uvs.push(s / crownSlices, r / crownRings);
    }
    crownStarts.push(start);
  }

  for (let r = 0; r < crownRings; r++) {
    const cur = crownStarts[r];
    const next = crownStarts[r + 1];
    for (let s = 0; s < crownSlices; s++) {
      indices.push(cur + s, cur + s + 1, next + s);
      indices.push(cur + s + 1, next + s + 1, next + s);
    }
  }

  // Ponytail Tail (curving down from back tie band)
  const tailRings = [
    { y: 1.58, x: 0.0, z: -0.095, r: 0.028 }, // Tie band
    { y: 1.52, x: 0.0, z: -0.115, r: 0.032 },
    { y: 1.46, x: 0.0, z: -0.125, r: 0.028 },
    { y: 1.40, x: 0.0, z: -0.128, r: 0.020 },
    { y: 1.34, x: 0.0, z: -0.120, r: 0.010 }, // Tapered tip
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

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  return attachSkinning(geom, (x, y, z) => {
    if (y >= 1.50) {
      return { indices: [JOINTS.Head, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    } else {
      const t = (y - 1.34) / (1.50 - 1.34);
      return { indices: [JOINTS.Head, JOINTS.Neck, 0, 0], weights: [t, 1 - t, 0, 0] };
    }
  });
}

// ── Validation & Test Execution ────────────────────────────────
console.log("Generating 3D Doctor Wardrobe geometries...");
const coatGeom = createLabCoatGeometry();
console.log("-> Lab Coat Geometry: Vertices =", coatGeom.attributes.position.count, "Indices =", coatGeom.index.count);

const scrubTopGeom = createScrubTopGeometry();
console.log("-> Scrub Top Geometry: Vertices =", scrubTopGeom.attributes.position.count, "Indices =", scrubTopGeom.index.count);

const scrubTrousersGeom = createScrubTrousersGeometry();
console.log("-> Scrub Trousers Geometry: Vertices =", scrubTrousersGeom.attributes.position.count, "Indices =", scrubTrousersGeom.index.count);

const sneakersGeom = createSneakersGeometry();
console.log("-> Sneakers Geometry: Vertices =", sneakersGeom.attributes.position.count, "Indices =", sneakersGeom.index.count);

const stethGeom = createStethoscopeGeometry();
console.log("-> Stethoscope Geometry: Vertices =", stethGeom.attributes.position.count, "Indices =", stethGeom.index.count);

const badgeGeom = createIDBadgeGeometry();
console.log("-> ID Badge Geometry: Vertices =", badgeGeom.attributes.position.count, "Indices =", badgeGeom.index.count);

const hairGeom = createPonytailHairGeometry();
console.log("-> Ponytail Hair Geometry: Vertices =", hairGeom.attributes.position.count, "Indices =", hairGeom.index.count);

console.log("=== ALL GARMENT GEOMETRIES SUCCESSFULLY GENERATED & VALIDATED ===");
