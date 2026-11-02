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

// 1. Sleek Volumetric Hair (Layered Crown Volume + Hair Sweeps + Center Part + Nape Bun)
export function createPonytailHairGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];

  const skullY = 1.646;
  const skullZ = 0.042;
  const rx = 0.098;
  const ry = 0.104;
  const rz = 0.106;

  // Layer 1: Volumetric hair cap conforming to skull with center part and layered volume
  const rings = 18;
  const slices = 36;
  const capStarts = [];

  for (let r = 0; r <= rings; r++) {
    const v = r / rings;
    const start = positions.length / 3;

    for (let s = 0; s <= slices; s++) {
      const u = s / slices;
      const theta = u * Math.PI * 2;

      // Realistic anatomical hairline curve
      const maxPhi = (0.42 - 0.13 * Math.cos(theta)) * Math.PI;
      const phi = v * maxPhi;

      // Subtle center part groove along top midline (x=0)
      let partIndent = 0;
      if (Math.abs(Math.sin(theta)) < 0.12 && Math.cos(theta) > 0 && v < 0.70) {
        partIndent = 0.0035 * (1.0 - Math.abs(Math.sin(theta)) / 0.12);
      }

      // Volumetric hair wave along parietal crown
      const wave = 0.003 * Math.cos(theta * 3.0) * Math.sin(phi);
      const hairThick = 0.009 + wave - partIndent;

      let px = Math.sin(theta) * Math.sin(phi) * (rx + hairThick);
      let py = skullY + Math.cos(phi) * (ry + hairThick);
      let pz = skullZ + Math.cos(theta) * Math.sin(phi) * (rz + hairThick);

      // Smooth diagonal sweep back toward the nape of neck
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

  // Layer 2: Elegant Low Bun / Chignon at the nape of neck
  // Outer hair coil torus
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

  // Hair tie band at base of bun
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

  // Tapered ponytail gather flowing down from the bun
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

// 2. Anatomical Redesigned Medical Stethoscope (True Drape, Realistic Chestpiece & Binaural Tubes)
export function createStethoscopeGeometry() {
  // A. Flexible PVC Neck & Shoulder Tubing
  // Natural drape from behind the neck, looping forward over the trapezius shoulders
  const tubePoints = [
    new THREE.Vector3(-0.046, 1.470, -0.038), // Behind left neck
    new THREE.Vector3(-0.076, 1.442,  0.015), // Left trapezius slope
    new THREE.Vector3(-0.072, 1.385,  0.085), // Left clavicle / shoulder front
    new THREE.Vector3(-0.052, 1.320,  0.138), // Left upper chest
    new THREE.Vector3(-0.035, 1.250,  0.156), // Right chest piece connector
    new THREE.Vector3( 0.015, 1.265,  0.155), // Mid sternum loop
    new THREE.Vector3( 0.052, 1.325,  0.136), // Right upper chest
    new THREE.Vector3( 0.072, 1.390,  0.082), // Right clavicle / shoulder front
    new THREE.Vector3( 0.076, 1.442,  0.015), // Right trapezius slope
    new THREE.Vector3( 0.046, 1.470, -0.038), // Behind right neck
  ];

  const tubeCurve = new THREE.CatmullRomCurve3(tubePoints);
  const tubeGeom = new THREE.TubeGeometry(tubeCurve, 54, 0.0065, 10, false);

  // B. Dual-Head Stainless Steel Chestpiece at Sternum (Diaphragm + Bell + Stem)
  // Large Diaphragm with outer silver metallic ring and dark acoustic rim
  const diaphragm = new THREE.CylinderGeometry(0.024, 0.024, 0.007, 24);
  diaphragm.rotateX(Math.PI / 2);
  diaphragm.translate(-0.035, 1.238, 0.158);

  // Small Pediatric Bell on rear of chestpiece
  const bell = new THREE.CylinderGeometry(0.016, 0.016, 0.005, 20);
  bell.rotateX(Math.PI / 2);
  bell.translate(-0.035, 1.238, 0.151);

  // Stainless steel stem connecting tube to chestpiece
  const stem = new THREE.CylinderGeometry(0.004, 0.004, 0.014, 12);
  stem.rotateZ(0.3);
  stem.translate(-0.035, 1.250, 0.157);

  // C. Metallic Binaural Tubes (meeting at central Y-spring on left chest)
  const leftBinaural = new THREE.CylinderGeometry(0.003, 0.003, 0.065, 8);
  leftBinaural.rotateZ(-0.35);
  leftBinaural.translate(0.048, 1.370, 0.138);

  const rightBinaural = new THREE.CylinderGeometry(0.003, 0.003, 0.065, 8);
  rightBinaural.rotateZ(-0.15);
  rightBinaural.translate(0.062, 1.365, 0.136);

  // Silicone Eartips at the top of the binaural tubes
  const leftEartip = new THREE.SphereGeometry(0.0055, 8, 8);
  leftEartip.translate(0.038, 1.398, 0.139);

  const rightEartip = new THREE.SphereGeometry(0.0055, 8, 8);
  rightEartip.translate(0.058, 1.395, 0.137);

  const geoms = [tubeGeom, diaphragm, bell, stem, leftBinaural, rightBinaural, leftEartip, rightEartip];
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
    if (y >= 1.44) {
      return { indices: [JOINTS.Neck, JOINTS.Spine2, 0, 0], weights: [0.60, 0.40, 0, 0] };
    } else {
      return { indices: [JOINTS.Spine2, 0, 0, 0], weights: [1.0, 0, 0, 0] };
    }
  });
}

const hair = createPonytailHairGeometry();
const steth = createStethoscopeGeometry();
console.log("Phase 5 Hair verts:", hair.attributes.position.count, "faces:", hair.index.count / 3);
console.log("Phase 5 Stethoscope verts:", steth.attributes.position.count, "faces:", steth.index.count / 3);
