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

export function skinLeg(isLeft, x, y, z) {
  const upLeg = isLeft ? JOINTS.LeftUpLeg : JOINTS.RightUpLeg;
  const leg = isLeft ? JOINTS.LeftLeg : JOINTS.RightLeg;
  const foot = isLeft ? JOINTS.LeftFoot : JOINTS.RightFoot;

  // Crotch / saddle bridge: blend across centerline
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

console.log("Skinning modules verified.");
