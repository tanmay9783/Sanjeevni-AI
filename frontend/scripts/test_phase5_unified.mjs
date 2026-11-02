import * as THREE from "three";
import { skinHumanoidTorso, JOINTS } from "./test_unified_skinning.mjs";

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

// 0. Anatomical Body
export function createAnatomicalBodyGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  const torsoRings = [
    { y: 1.45, rx: 0.052, rz: 0.055, zc: 0.005 },
    { y: 1.41, rx: 0.075, rz: 0.065, zc: 0.008 },
    { y: 1.38, rx: 0.135, rz: 0.078, zc: 0.012 }, // Full shoulder width
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
      positions.push(Math.sin(theta) * ring.rx, ring.y, ring.zc + Math.cos(theta) * ring.rz);
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
        positions.push(ring.x + Math.cos(phi) * ring.r * 0.88, ring.y + Math.sin(phi) * ring.r * 0.72, ring.z + Math.sin(phi) * ring.r);
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
  createArm(true);
  createArm(false);

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
        positions.push(legX + Math.sin(theta) * ring.rx, ring.y, ring.zc + Math.cos(theta) * ring.rz);
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
  createLeg(true);
  createLeg(false);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return attachSkinning(geom, skinHumanoidTorso);
}

// 1. Scrub Top
export function createScrubTopGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  // Continuous trunk rings from deep pelvic hem Y=0.82 up to collar Y=1.46
  const trunkRings = [
    { y: 0.82, rx: 0.165, rz: 0.106, zc: 0.032, vDip: 0 }, // Deep inside trousers
    { y: 0.92, rx: 0.162, rz: 0.104, zc: 0.030, vDip: 0 },
    { y: 1.02, rx: 0.155, rz: 0.098, zc: 0.028, vDip: 0 }, // Under waistband
    { y: 1.12, rx: 0.144, rz: 0.092, zc: 0.025, vDip: 0 }, // Natural waist
    { y: 1.22, rx: 0.148, rz: 0.096, zc: 0.022, vDip: 0 }, // Lower ribcage
    { y: 1.30, rx: 0.154, rz: 0.100, zc: 0.018, vDip: 0 }, // Mid bust
    { y: 1.36, rx: 0.156, rz: 0.100, zc: 0.014, vDip: 0.038 }, // Upper chest V-neck plunge
    { y: 1.42, rx: 0.142, rz: 0.092, zc: 0.008, vDip: 0.020 },
    { y: 1.46, rx: 0.095, rz: 0.082, zc: 0.002, vDip: 0.000 }, // Clavicle rim
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

      positions.push(px, py, pz);
      uvs.push(s / tSlices, r / (trunkRings.length - 1));
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
        positions.push(ring.x + Math.cos(phi) * ring.r * 0.88, ring.y + Math.sin(phi) * ring.r * 0.70, ring.z + Math.sin(phi) * ring.r);
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
  return attachSkinning(geom, skinHumanoidTorso);
}

// 2. Scrub Trousers
export function createScrubTrousersGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  const pelvisRings = [
    { y: 1.05, rx: 0.170, rz: 0.112, zc: 0.035 }, // High waistband overlapping scrub top
    { y: 0.98, rx: 0.175, rz: 0.116, zc: 0.036 },
    { y: 0.92, rx: 0.178, rz: 0.120, zc: 0.037 },
    { y: 0.86, rx: 0.180, rz: 0.122, zc: 0.038 }, // Hip line
  ];

  const pSlices = 28;
  const pStarts = [];
  for (let r = 0; r < pelvisRings.length; r++) {
    const ring = pelvisRings[r];
    const start = positions.length / 3;
    for (let s = 0; s <= pSlices; s++) {
      const theta = (s / pSlices) * Math.PI * 2;
      positions.push(Math.sin(theta) * ring.rx, ring.y, ring.zc + Math.cos(theta) * ring.rz);
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

  // Crotch Bridge with unified skinning
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
      positions.push(w * 0.018, y, z);
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
        positions.push(legX + Math.sin(theta) * ring.rx, ring.y, ring.zc + Math.cos(theta) * ring.rz);
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
  createLeg(true);
  createLeg(false);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return attachSkinning(geom, skinHumanoidTorso);
}

// 3. Lab Coat
export function createLabCoatGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  const rings = [
    { y: 1.46, xc: 0.0, zc: -0.015, rx: 0.115, rz: 0.115, gap: 0.024 }, // Collar rim
    { y: 1.42, xc: 0.0, zc: -0.005, rx: 0.185, rz: 0.125, gap: 0.030 }, // Broad shoulder yoke
    { y: 1.36, xc: 0.0, zc: 0.005,  rx: 0.185, rz: 0.130, gap: 0.036 }, // Upper chest
    { y: 1.30, xc: 0.0, zc: 0.010,  rx: 0.182, rz: 0.130, gap: 0.040 }, // Mid chest
    { y: 1.24, xc: 0.0, zc: 0.016,  rx: 0.180, rz: 0.130, gap: 0.042 }, // Lower chest
    { y: 1.18, xc: 0.0, zc: 0.022,  rx: 0.182, rz: 0.134, gap: 0.044 }, // Upper waist
    { y: 1.12, xc: 0.0, zc: 0.026,  rx: 0.188, rz: 0.138, gap: 0.046 }, // Mid waist
    { y: 1.05, xc: 0.0, zc: 0.030,  rx: 0.198, rz: 0.146, gap: 0.048 }, // Low waist
    { y: 0.98, xc: 0.0, zc: 0.032,  rx: 0.210, rz: 0.152, gap: 0.050 }, // Pelvis
    { y: 0.90, xc: 0.0, zc: 0.028,  rx: 0.218, rz: 0.156, gap: 0.052 }, // Upper thigh
    { y: 0.82, xc: 0.0, zc: 0.022,  rx: 0.224, rz: 0.158, gap: 0.054 }, // Mid thigh
    { y: 0.74, xc: 0.0, zc: 0.016,  rx: 0.228, rz: 0.160, gap: 0.055 }, // Lower thigh
    { y: 0.68, xc: 0.0, zc: 0.010,  rx: 0.230, rz: 0.162, gap: 0.056 }, // Mid-thigh hemline
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
      positions.push(ring.xc + Math.sin(theta) * ring.rx, ring.y, ring.zc + Math.cos(theta) * ring.rz);
      uvs.push(t, r / (rings.length - 1));
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
      [sign * 0.035, 1.46, 0.095],
      [sign * 0.140, 1.42, 0.130],
      [sign * 0.110, 1.37, 0.140],
      [sign * 0.150, 1.34, 0.150],
      [sign * 0.100, 1.27, 0.146],
      [sign * 0.048, 1.22, 0.142],
    ];
    const inner = [
      [sign * 0.024, 1.46, 0.092],
      [sign * 0.030, 1.42, 0.110],
      [sign * 0.036, 1.37, 0.122],
      [sign * 0.040, 1.34, 0.128],
      [sign * 0.044, 1.27, 0.134],
      [sign * 0.048, 1.22, 0.138],
    ];
    for (let i = 0; i < outer.length; i++) {
      positions.push(inner[i][0], inner[i][1], inner[i][2]);
      positions.push(outer[i][0], outer[i][1], outer[i][2] + 0.003);
      uvs.push(0, i / (outer.length - 1), 1, i / (outer.length - 1));
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
      { y: 1.43, x: sign * 0.145, z: -0.010, r: 0.060 }, // Armscye seam
      { y: 1.38, x: sign * 0.185, z: -0.018, r: 0.056 },
      { y: 1.32, x: sign * 0.235, z: -0.022, r: 0.052 },
      { y: 1.25, x: sign * 0.285, z: -0.024, r: 0.048 },
      { y: 1.18, x: sign * 0.328, z: 0.004,  r: 0.044 },
      { y: 1.11, x: sign * 0.368, z: 0.038,  r: 0.042 },
      { y: 1.05, x: sign * 0.402, z: 0.068,  r: 0.040 },
    ];
    const sSlices = 16;
    const sStarts = [];
    for (let r = 0; r < sleeveRings.length; r++) {
      const ring = sleeveRings[r];
      const start = positions.length / 3;
      for (let s = 0; s <= sSlices; s++) {
        const phi = (s / sSlices) * Math.PI * 2;
        positions.push(ring.x + Math.cos(phi) * ring.r * 0.88, ring.y + Math.sin(phi) * ring.r * 0.88 * 0.72, ring.z + Math.sin(phi) * ring.r);
        uvs.push(s / sSlices, r / (sleeveRings.length - 1));
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

  // 3 Patch Pockets
  function createPatchPocket(xMin, xMax, yMin, yMax, zBase) {
    const start = positions.length / 3;
    const zOut = zBase + 0.006;
    positions.push(xMin, yMin, zOut, xMax, yMin, zOut, xMax, yMax, zOut, xMin, yMax, zOut);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);

    const wStart = positions.length / 3;
    positions.push(xMin, yMax, zOut, xMax, yMax, zOut, xMax, yMax + 0.010, zOut + 0.002, xMin, yMax + 0.010, zOut + 0.002);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(wStart, wStart + 1, wStart + 2, wStart, wStart + 2, wStart + 3);
  }
  createPatchPocket(0.055, 0.125, 1.23, 1.32, 0.138); // Upper chest
  createPatchPocket(0.080, 0.175, 0.74, 0.88, 0.158); // Left hip
  createPatchPocket(-0.175, -0.080, 0.74, 0.88, 0.158); // Right hip

  // 4 White Placket Buttons
  [1.18, 1.05, 0.92, 0.80].forEach(by => {
    const btn = new THREE.CylinderGeometry(0.0065, 0.0065, 0.003, 12);
    btn.rotateX(Math.PI / 2);
    btn.translate(-0.040, by, 0.144);
    const bp = btn.attributes.position.array;
    const bi = btn.index.array;
    const bs = positions.length / 3;
    for (let i = 0; i < bp.length; i += 3) {
      positions.push(bp[i], bp[i + 1], bp[i + 2]);
      uvs.push(0.5, 0.5);
    }
    for (let i = 0; i < bi.length; i++) {
      indices.push(bi[i] + bs);
    }
  });

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return attachSkinning(geom, skinHumanoidTorso);
}

const b = createAnatomicalBodyGeometry();
const s = createScrubTopGeometry();
const t = createScrubTrousersGeometry();
const c = createLabCoatGeometry();

console.log("Body verts:", b.attributes.position.count, "faces:", b.index.count / 3);
console.log("ScrubTop verts:", s.attributes.position.count, "faces:", s.index.count / 3);
console.log("ScrubTrousers verts:", t.attributes.position.count, "faces:", t.index.count / 3);
console.log("LabCoat verts:", c.attributes.position.count, "faces:", c.index.count / 3);
