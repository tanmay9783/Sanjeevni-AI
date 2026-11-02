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

// ── 1. Tailored Physician Lab Coat (Outer Layer) ────────────────
// Structured collar, notched lapels, 3D buttons, patch pockets, wrist cuffs
export function createLabCoatGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  // Coat trunk rings: continuous from collar Y=1.46 down to mid-thigh Y=0.68
  const rings = [
    { y: 1.46, xc: 0.0, zc: -0.015, rx: 0.108, rz: 0.108, gap: 0.024 }, // Collar rim
    { y: 1.42, xc: 0.0, zc: -0.008, rx: 0.148, rz: 0.114, gap: 0.030 }, // Shoulders
    { y: 1.36, xc: 0.0, zc: 0.005,  rx: 0.176, rz: 0.122, gap: 0.036 }, // Upper chest
    { y: 1.30, xc: 0.0, zc: 0.010,  rx: 0.178, rz: 0.124, gap: 0.040 }, // Mid chest
    { y: 1.24, xc: 0.0, zc: 0.016,  rx: 0.174, rz: 0.122, gap: 0.042 }, // Lower chest
    { y: 1.18, xc: 0.0, zc: 0.022,  rx: 0.174, rz: 0.126, gap: 0.044 }, // Upper waist
    { y: 1.12, xc: 0.0, zc: 0.026,  rx: 0.182, rz: 0.132, gap: 0.046 }, // Mid waist
    { y: 1.05, xc: 0.0, zc: 0.030,  rx: 0.194, rz: 0.142, gap: 0.048 }, // Low waist (clear of trousers waistband)
    { y: 0.98, xc: 0.0, zc: 0.032,  rx: 0.206, rz: 0.148, gap: 0.050 }, // Pelvis / Hip line
    { y: 0.90, xc: 0.0, zc: 0.028,  rx: 0.214, rz: 0.150, gap: 0.052 }, // Upper thigh
    { y: 0.82, xc: 0.0, zc: 0.022,  rx: 0.220, rz: 0.152, gap: 0.054 }, // Mid thigh
    { y: 0.74, xc: 0.0, zc: 0.016,  rx: 0.224, rz: 0.154, gap: 0.055 }, // Lower thigh
    { y: 0.68, xc: 0.0, zc: 0.010,  rx: 0.228, rz: 0.156, gap: 0.056 }, // Mid-thigh hemline
  ];

  const numSlices = 32;
  const ringVertCounts = [];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const vertStart = positions.length / 3;

    // Front opening gap angle: symmetrical opening on both sides of midline
    const minTheta = Math.asin(Math.min(0.85, ring.gap / ring.rx));
    const maxTheta = 2 * Math.PI - minTheta;

    for (let s = 0; s <= numSlices; s++) {
      const t = s / numSlices;
      const theta = minTheta + t * (maxTheta - minTheta);

      const px = ring.xc + Math.sin(theta) * ring.rx;
      const py = ring.y;
      const pz = ring.zc + Math.cos(theta) * ring.rz;

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

  // Notched Lapels: Tailored fold-over lapels on both left and right sides
  function createNotchedLapel(isLeft) {
    const sign = isLeft ? 1 : -1;
    const lStart = positions.length / 3;

    // Lapel profile vertices from neck to lapel tip, notch, and lower chest fold
    const outer = [
      [sign * 0.035, 1.46, 0.090], // Neck base
      [sign * 0.135, 1.42, 0.125], // Upper lapel peak
      [sign * 0.105, 1.37, 0.135], // Notch indent (90 deg cut)
      [sign * 0.145, 1.34, 0.145], // Lower lapel peak
      [sign * 0.095, 1.27, 0.142], // Mid lower lapel
      [sign * 0.045, 1.22, 0.138], // Base roll at button
    ];

    const inner = [
      [sign * 0.024, 1.46, 0.088],
      [sign * 0.030, 1.42, 0.104],
      [sign * 0.036, 1.37, 0.118],
      [sign * 0.040, 1.34, 0.124],
      [sign * 0.042, 1.27, 0.128],
      [sign * 0.045, 1.22, 0.135],
    ];

    // Push front and back faces with 2mm thickness
    for (let i = 0; i < outer.length; i++) {
      positions.push(inner[i][0], inner[i][1], inner[i][2]);
      positions.push(outer[i][0], outer[i][1], outer[i][2] + 0.003);
      uvs.push(0, i / (outer.length - 1), 1, i / (outer.length - 1));
    }

    const n = outer.length;
    for (let i = 0; i < n - 1; i++) {
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

  createNotchedLapel(true);  // Left lapel
  createNotchedLapel(false); // Right lapel

  // Generous Full-Length Sleeves (enclosing the short scrub sleeves completely)
  function createSleeve(isLeft) {
    const sign = isLeft ? 1 : -1;
    const sleeveRings = [
      { y: 1.44, x: sign * 0.135, z: -0.015, r: 0.058 }, // Armscye seam
      { y: 1.38, x: sign * 0.180, z: -0.020, r: 0.054 },
      { y: 1.32, x: sign * 0.230, z: -0.024, r: 0.050 },
      { y: 1.25, x: sign * 0.280, z: -0.026, r: 0.046 },
      { y: 1.18, x: sign * 0.325, z: 0.002,  r: 0.043 },
      { y: 1.11, x: sign * 0.365, z: 0.038,  r: 0.040 },
      { y: 1.05, x: sign * 0.400, z: 0.068,  r: 0.038 }, // Wrist cuff
    ];

    const sleeveSlices = 16;
    const sleeveVertCounts = [];

    for (let r = 0; r < sleeveRings.length; r++) {
      const ring = sleeveRings[r];
      const start = positions.length / 3;

      for (let s = 0; s <= sleeveSlices; s++) {
        const phi = (s / sleeveSlices) * Math.PI * 2;
        const px = ring.x + Math.cos(phi) * ring.r * 0.88;
        const py = ring.y + Math.sin(phi) * ring.r * 0.88 * 0.72;
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

  createSleeve(true);  // Left arm
  createSleeve(false); // Right arm

  // 3D Patch Pockets with welt borders
  function createPatchPocket(xMin, xMax, yMin, yMax, zBase) {
    const start = positions.length / 3;
    const zOut = zBase + 0.007;
    // Front face
    positions.push(xMin, yMin, zOut, xMax, yMin, zOut, xMax, yMax, zOut, xMin, yMax, zOut);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);

    // Top hem welt rim
    const wStart = positions.length / 3;
    positions.push(xMin, yMax, zOut, xMax, yMax, zOut, xMax, yMax + 0.012, zOut + 0.002, xMin, yMax + 0.012, zOut + 0.002);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(wStart, wStart + 1, wStart + 2, wStart, wStart + 2, wStart + 3);
  }

  createPatchPocket(0.055, 0.122, 1.23, 1.32, 0.130); // Left upper chest pocket (under staff badge)

  // 3D White Medical Coat Buttons along right front placket
  const buttonYs = [1.18, 1.05, 0.92, 0.80];
  const bRadius = 0.0065;
  const bDepth = 0.003;
  const bSegments = 12;

  buttonYs.forEach((by) => {
    const btnGeom = new THREE.CylinderGeometry(bRadius, bRadius, bDepth, bSegments);
    btnGeom.rotateX(Math.PI / 2);
    btnGeom.translate(-0.040, by, 0.138);

    const bPos = btnGeom.attributes.position.array;
    const bIdx = btnGeom.index.array;
    const bStart = positions.length / 3;

    for (let i = 0; i < bPos.length; i += 3) {
      positions.push(bPos[i], bPos[i + 1], bPos[i + 2]);
      uvs.push(0.5, 0.5);
    }
    for (let i = 0; i < bIdx.length; i++) {
      indices.push(bIdx[i] + bStart);
    }
  });

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
      const legJoint = x > 0.04 ? JOINTS.LeftUpLeg : (x < -0.04 ? JOINTS.RightUpLeg : JOINTS.Hips);
      return {
        indices: [JOINTS.Hips, legJoint, 0, 0],
        weights: [0.80 + 0.20 * t, (1.0 - t) * 0.20, 0, 0],
      };
    }
  });
}

// ── 2. Complete Medical Scrub Top (Inner Layer) ─────────────────
// Form-fitting torso with realistic V-neck plunge and short sleeves
export function createScrubTopGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  // Inner torso trunk rings (radii 8-10mm smaller than lab coat)
  const trunkRings = [
    { y: 0.96, rx: 0.158, rz: 0.098, zc: 0.034 }, // Waist hem (tucked into trousers)
    { y: 1.04, rx: 0.146, rz: 0.092, zc: 0.032 },
    { y: 1.12, rx: 0.138, rz: 0.088, zc: 0.028 },
    { y: 1.20, rx: 0.140, rz: 0.090, zc: 0.022 },
    { y: 1.26, rx: 0.146, rz: 0.094, zc: 0.018 },
    { y: 1.34, rx: 0.150, rz: 0.098, zc: 0.012 }, // Chest line
  ];

  const trunkSlices = 28;
  const trunkStarts = [];

  for (let r = 0; r < trunkRings.length; r++) {
    const ring = trunkRings[r];
    const start = positions.length / 3;
    for (let s = 0; s <= trunkSlices; s++) {
      const theta = (s / trunkSlices) * Math.PI * 2;
      const px = Math.sin(theta) * ring.rx;
      const pz = ring.zc + Math.cos(theta) * ring.rz;
      const py = ring.y;
      positions.push(px, py, pz);
      uvs.push(s / trunkSlices, r / (trunkRings.length - 1));
    }
    trunkStarts.push(start);
  }

  for (let r = 0; r < trunkRings.length - 1; r++) {
    const cur = trunkStarts[r];
    const next = trunkStarts[r + 1];
    for (let s = 0; s < trunkSlices; s++) {
      indices.push(cur + s, next + s, cur + s + 1);
      indices.push(cur + s + 1, next + s, next + s + 1);
    }
  }

  // Upper Chest, Yoke & V-Neckline (Y=1.34 to Y=1.46)
  const upperRings = [
    { y: 1.38, rx: 0.142, rz: 0.090, zc: 0.008, vDip: 0.034 },
    { y: 1.42, rx: 0.128, rz: 0.082, zc: 0.004, vDip: 0.018 },
    { y: 1.46, rx: 0.088, rz: 0.076, zc: -0.006, vDip: 0.000 }, // Collarbone
  ];

  const upperStarts = [];
  for (let r = 0; r < upperRings.length; r++) {
    const ring = upperRings[r];
    const start = positions.length / 3;
    for (let s = 0; s <= trunkSlices; s++) {
      const theta = (s / trunkSlices) * Math.PI * 2;
      let px = Math.sin(theta) * ring.rx;
      let pz = ring.zc + Math.cos(theta) * ring.rz;
      let py = ring.y;

      // Realistic V-neck plunge at front center
      if (Math.cos(theta) > 0.55) {
        py -= ring.vDip * (Math.cos(theta) - 0.55) * 3.2;
        if (ring.vDip > 0.01) pz += 0.004;
      }

      positions.push(px, py, pz);
      uvs.push(s / trunkSlices, 0.7 + 0.3 * (r / (upperRings.length - 1)));
    }
    upperStarts.push(start);
  }

  let prevStart = trunkStarts[trunkStarts.length - 1];
  for (let r = 0; r < upperRings.length; r++) {
    const nextStart = upperStarts[r];
    for (let s = 0; s < trunkSlices; s++) {
      indices.push(prevStart + s, nextStart + s, prevStart + s + 1);
      indices.push(prevStart + s + 1, nextStart + s, nextStart + s + 1);
    }
    prevStart = nextStart;
  }

  // Short Medical Scrub Sleeves (compact radius to stay INSIDE lab coat sleeves)
  function createShortSleeve(isLeft) {
    const sign = isLeft ? 1 : -1;
    const sleeveRings = [
      { y: 1.43, x: sign * 0.135, z: -0.005, r: 0.038 }, // Under coat shoulder
      { y: 1.39, x: sign * 0.165, z: -0.010, r: 0.036 },
      { y: 1.34, x: sign * 0.190, z: -0.015, r: 0.034 }, // Short sleeve hem
    ];
    const slices = 14;
    const sStarts = [];

    for (let r = 0; r < sleeveRings.length; r++) {
      const ring = sleeveRings[r];
      const start = positions.length / 3;
      for (let s = 0; s <= slices; s++) {
        const phi = (s / slices) * Math.PI * 2;
        const px = ring.x + Math.cos(phi) * ring.r * 0.85;
        const py = ring.y + Math.sin(phi) * ring.r * 0.85 * 0.7;
        const pz = ring.z + Math.sin(phi) * ring.r;
        positions.push(px, py, pz);
        uvs.push(s / slices, r / (sleeveRings.length - 1));
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

  return attachSkinning(geom, (x, y, z) => {
    if (Math.abs(x) > 0.13 && y > 1.30) {
      const isLeft = x > 0;
      const sh = isLeft ? JOINTS.LeftShoulder : JOINTS.RightShoulder;
      const arm = isLeft ? JOINTS.LeftArm : JOINTS.RightArm;
      return { indices: [sh, arm, 0, 0], weights: [0.5, 0.5, 0, 0] };
    }

    if (y >= 1.36) {
      const t = Math.min(1.0, (y - 1.36) / 0.10);
      return { indices: [JOINTS.Neck, JOINTS.Spine2, 0, 0], weights: [t * 0.45, 1.0 - t * 0.45, 0, 0] };
    } else if (y >= 1.20) {
      const t = (y - 1.20) / 0.16;
      return { indices: [JOINTS.Spine2, JOINTS.Spine1, 0, 0], weights: [t, 1 - t, 0, 0] };
    } else if (y >= 1.08) {
      const t = (y - 1.08) / 0.12;
      return { indices: [JOINTS.Spine1, JOINTS.Spine, 0, 0], weights: [t, 1 - t, 0, 0] };
    } else {
      const t = (y - 0.96) / 0.12;
      return { indices: [JOINTS.Spine, JOINTS.Hips, 0, 0], weights: [t, 1 - t, 0, 0] };
    }
  });
}

// ── 3. Continuous Watertight Scrub Trousers ─────────────────────
// Pelvis waistband, seamless crotch junction, straight legs, and ankle cuffs
export function createScrubTrousersGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  // Pelvis / Waistband rings (from waist Y=1.03 down to crotch Y=0.88)
  const pelvisRings = [
    { y: 1.03, rx: 0.170, rz: 0.110, zc: 0.035 }, // Waistband
    { y: 0.98, rx: 0.175, rz: 0.116, zc: 0.036 }, // Upper pelvis
    { y: 0.93, rx: 0.178, rz: 0.120, zc: 0.037 }, // Mid pelvis
    { y: 0.88, rx: 0.180, rz: 0.122, zc: 0.038 }, // Crotch / hip line
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
      positions.push(px, py, pz);
      uvs.push(s / pSlices, r / (pelvisRings.length - 1));
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

  // Crotch Bridge: connecting front center to back center
  const crotchY = 0.86;
  const bridgeSteps = 6;
  const bridgeStarts = [];

  for (let b = 0; b <= bridgeSteps; b++) {
    const v = b / bridgeSteps;
    const start = positions.length / 3;
    const z = 0.080 - v * 0.145; // Front to back
    const dip = Math.sin(v * Math.PI) * 0.025;
    const y = crotchY - dip;

    for (let w = -2; w <= 2; w++) {
      const x = w * 0.018;
      positions.push(x, y, z);
      uvs.push((w + 2) / 4, v);
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

  // Straight Leg Trousers (Left leg X > 0, Right leg X < 0)
  function createLeg(isLeft) {
    const sign = isLeft ? 1 : -1;
    const legX = sign * 0.095;

    const legRings = [
      { y: 0.86, rx: 0.086, rz: 0.086, zc: 0.030 }, // Inseam top
      { y: 0.78, rx: 0.082, rz: 0.082, zc: 0.024 }, // Upper thigh
      { y: 0.68, rx: 0.078, rz: 0.078, zc: 0.018 }, // Mid thigh
      { y: 0.58, rx: 0.074, rz: 0.074, zc: 0.014 }, // Lower thigh
      { y: 0.48, rx: 0.072, rz: 0.072, zc: 0.012 }, // Knee
      { y: 0.38, rx: 0.070, rz: 0.070, zc: 0.010 }, // Upper calf
      { y: 0.28, rx: 0.068, rz: 0.068, zc: 0.008 }, // Mid calf
      { y: 0.18, rx: 0.066, rz: 0.066, zc: 0.006 }, // Lower calf
      { y: 0.12, rx: 0.065, rz: 0.065, zc: 0.005 }, // Ankle cuff
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

    // Ankle cuff ribbing
    const cuffStart = positions.length / 3;
    const cRing = legRings[legRings.length - 1];
    for (let s = 0; s <= lSlices; s++) {
      const theta = (s / lSlices) * Math.PI * 2;
      const px = legX + Math.sin(theta) * (cRing.rx + 0.004);
      const py = cRing.y - 0.015;
      const pz = cRing.zc + Math.cos(theta) * (cRing.rz + 0.004);
      positions.push(px, py, pz);
      uvs.push(s / lSlices, 1.0);
    }
    const lastLegRing = lStarts[lStarts.length - 1];
    for (let s = 0; s < lSlices; s++) {
      indices.push(lastLegRing + s, isLeft ? cuffStart + s : lastLegRing + s + 1, isLeft ? lastLegRing + s + 1 : cuffStart + s);
      indices.push(lastLegRing + s + 1, isLeft ? cuffStart + s : cuffStart + s + 1, isLeft ? cuffStart + s + 1 : cuffStart + s);
    }
  }

  createLeg(true);  // Left leg
  createLeg(false); // Right leg

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);

  return attachSkinning(geom, (x, y, z) => {
    if (y > 0.88) {
      return { indices: [JOINTS.Hips, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    }

    const isLeft = x >= 0;
    const upLeg = isLeft ? JOINTS.LeftUpLeg : JOINTS.RightUpLeg;
    const leg = isLeft ? JOINTS.LeftLeg : JOINTS.RightLeg;
    const foot = isLeft ? JOINTS.LeftFoot : JOINTS.RightFoot;

    if (y > 0.50) {
      const t = (y - 0.50) / (0.88 - 0.50);
      return { indices: [upLeg, leg, 0, 0], weights: [0.35 + 0.65 * t, (1.0 - t) * 0.65, 0, 0] };
    } else if (y > 0.16) {
      const t = (y - 0.16) / (0.50 - 0.16);
      return { indices: [leg, foot, 0, 0], weights: [0.75 + 0.25 * t, (1.0 - t) * 0.25, 0, 0] };
    } else {
      return { indices: [leg, foot, 0, 0], weights: [0.4, 0.6, 0, 0] };
    }
  });
}

// ── 4. White Athletic Medical Sneakers ──────────────────────────
// Thick EVA cushioned sole, heel counter, toe rocker, and white athletic laces
export function createSneakersGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  function createShoe(isLeft) {
    const sign = isLeft ? 1 : -1;
    const footX = sign * 0.098;

    // Midsole & Outsole (Y=0.01 to Y=0.065)
    const soleLevels = [
      { y: 0.010, zFront: 0.165, zBack: -0.095, rx: 0.052, rz: 0.130 }, // Tread base
      { y: 0.035, zFront: 0.170, zBack: -0.098, rx: 0.054, rz: 0.134 }, // EVA Midsole
      { y: 0.060, zFront: 0.165, zBack: -0.095, rx: 0.050, rz: 0.130 }, // Welt seam
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
          py += 0.016 * (Math.cos(theta) - 0.4); // Toe rocker
        } else if (Math.cos(theta) < -0.3) {
          py += 0.020 * Math.abs(Math.cos(theta) + 0.3); // Heel elevation
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

    // Upper Shoe Body (Y=0.06 to Y=0.125)
    const upperLevels = [
      { y: 0.065, zc: 0.035, rx: 0.048, rz: 0.125 }, // Base of upper
      { y: 0.088, zc: 0.032, rx: 0.045, rz: 0.115 }, // Mid upper / vamp
      { y: 0.115, zc: 0.024, rx: 0.040, rz: 0.095 }, // Ankle opening & tongue
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

    // Connect sole to upper
    const topSole = soleStarts[soleStarts.length - 1];
    const baseUpper = upperStarts[0];
    for (let s = 0; s < soleSlices; s++) {
      indices.push(topSole + s, isLeft ? baseUpper + s : topSole + s + 1, isLeft ? topSole + s + 1 : baseUpper + s);
      indices.push(topSole + s + 1, isLeft ? baseUpper + s : baseUpper + s + 1, isLeft ? baseUpper + s + 1 : baseUpper + s);
    }

    // White Shoe Laces (4 criss-cross bars over instep)
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

    if (z > 0.08) {
      return { indices: [toe, foot, 0, 0], weights: [0.85, 0.15, 0, 0] };
    } else {
      return { indices: [foot, toe, 0, 0], weights: [0.90, 0.10, 0, 0] };
    }
  });
}

// ── 5. Realistic Medical Stethoscope ────────────────────────────
// Natural drape over shoulders, chrome binaural headset, stainless steel dual-head chest piece
export function createStethoscopeGeometry() {
  const curvePoints = [
    new THREE.Vector3(-0.048, 1.48, -0.045), // Behind left neck
    new THREE.Vector3(-0.082, 1.44, 0.025),  // Over left trapezius/shoulder
    new THREE.Vector3(-0.068, 1.35, 0.118),  // Left upper chest
    new THREE.Vector3(-0.030, 1.25, 0.144),  // Toward sternum
    new THREE.Vector3(0.022, 1.22, 0.150),   // Right chest piece mount
    new THREE.Vector3(0.042, 1.34, 0.120),   // Right upper chest
    new THREE.Vector3(0.078, 1.44, 0.025),   // Over right trapezius/shoulder
    new THREE.Vector3(0.048, 1.48, -0.045),  // Behind right neck
  ];

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const tubeGeom = new THREE.TubeGeometry(curve, 48, 0.0075, 10, false);

  // Precision Dual-Head Stainless Steel Chest Piece
  const chestPiece = new THREE.CylinderGeometry(0.025, 0.025, 0.010, 24);
  chestPiece.rotateX(Math.PI / 2);
  chestPiece.translate(0.022, 1.22, 0.152);

  const bell = new THREE.CylinderGeometry(0.017, 0.017, 0.006, 20);
  bell.rotateX(Math.PI / 2);
  bell.translate(0.022, 1.22, 0.144);

  const geoms = [tubeGeom, chestPiece, bell];
  let totalVerts = 0;
  let totalIdx = 0;
  geoms.forEach(g => {
    totalVerts += g.attributes.position.count;
    totalIdx += g.index ? g.index.count : 0;
  });

  const mergedPos = new Float32Array(totalVerts * 3);
  const mergedIdx = new Uint16Array(totalIdx);

  let vOffset = 0;
  let iOffset = 0;

  geoms.forEach(g => {
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

  return attachSkinning(geom, (x, y, z) => {
    if (y >= 1.45) {
      return { indices: [JOINTS.Neck, JOINTS.Spine2, 0, 0], weights: [0.75, 0.25, 0, 0] };
    } else {
      return { indices: [JOINTS.Spine2, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    }
  });
}

// ── 6. Hospital Identification Badge Card ──────────────────────
// Clipped to the upper left chest pocket (viewer's right side)
export function createIDBadgeGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  const cardX = 0.088;
  const cardY = 1.285;
  const cardZ = 0.138;
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

  // Silver metal clip at top of badge
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

  return attachSkinning(geom, () => {
    return { indices: [JOINTS.Spine2, 0, 0, 0], weights: [1.0, 0, 0, 0] };
  });
}

// ── 7. Sleek Ponytail Hair (Hair Cap + Elastic Tie + Low Ponytail / Bun) ──
// Conforms to skull, center part line, gathered cleanly at nape of neck
export function createPonytailHairGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  // Skull hair cap: covers top, sides, and back of head
  const rings = 16;
  const slices = 32;
  const capStarts = [];

  const skullY = 1.646;
  const skullZ = 0.042;
  const rx = 0.096;
  const ry = 0.100;
  const rz = 0.104;

  for (let r = 0; r <= rings; r++) {
    const v = r / rings;
    const start = positions.length / 3;

    for (let s = 0; s <= slices; s++) {
      const u = s / slices;
      const theta = u * Math.PI * 2;

      // Natural anatomical hairline: higher in front (above forehead), curved at sides, low at nape
      const maxPhi = (0.42 - 0.12 * Math.cos(theta)) * Math.PI;
      const phi = v * maxPhi;

      let partIndent = 0;
      if (Math.abs(Math.sin(theta)) < 0.10 && Math.cos(theta) > 0 && v < 0.70) {
        partIndent = 0.0035 * (1.0 - Math.abs(Math.sin(theta)) / 0.10);
      }

      const hairThick = 0.008 - partIndent;

      let px = Math.sin(theta) * Math.sin(phi) * (rx + hairThick);
      let py = skullY + Math.cos(phi) * (ry + hairThick);
      let pz = skullZ + Math.cos(theta) * Math.sin(phi) * (rz + hairThick);

      // Smooth sweep back toward nape of neck
      if (v > 0.40) {
        const pull = (v - 0.40) * 0.024;
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

  // Elastic Hair Tie Band at nape of neck
  const band = new THREE.TorusGeometry(0.022, 0.007, 8, 16);
  band.rotateX(Math.PI / 2);
  band.translate(0, 1.54, -0.075);
  const bPos = band.attributes.position.array;
  const bIdx = band.index.array;
  const bandStart = positions.length / 3;

  for (let i = 0; i < bPos.length; i += 3) {
    positions.push(bPos[i], bPos[i + 1], bPos[i + 2]);
    uvs.push(0.5, 0.5);
  }
  for (let i = 0; i < bIdx.length; i++) {
    indices.push(bIdx[i] + bandStart);
  }

  // Neat gathered ponytail / bun flowing down from hair tie
  const tailRings = [
    { y: 1.54, x: 0.0, z: -0.075, r: 0.020 },
    { y: 1.49, x: 0.0, z: -0.088, r: 0.023 },
    { y: 1.43, x: 0.0, z: -0.094, r: 0.021 },
    { y: 1.38, x: 0.0, z: -0.090, r: 0.016 },
    { y: 1.34, x: 0.0, z: -0.082, r: 0.008 },
  ];
  const tSlices = 14;
  const tStarts = [];

  for (let r = 0; r < tailRings.length; r++) {
    const ring = tailRings[r];
    const start = positions.length / 3;
    for (let s = 0; s <= tSlices; s++) {
      const theta = (s / tSlices) * Math.PI * 2;
      const px = ring.x + Math.sin(theta) * ring.r;
      const pz = ring.z + Math.cos(theta) * ring.r;
      const py = ring.y;
      positions.push(px, py, pz);
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

  return attachSkinning(geom, (x, y, z) => {
    return { indices: [JOINTS.Head, 0, 0, 0], weights: [1.0, 0, 0, 0] };
  });
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
      color: new THREE.Color("#0E4E54"),
      roughness: 0.72,
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
      metalness: 0.60,
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
