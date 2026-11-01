
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { button, useControls } from "leva";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useChat } from "../hooks/useChat";

const facialExpressions = {
  default: {
    mouthSmileLeft: 0.22,
    mouthSmileRight: 0.22,
    eyeSquintLeft: 0.12,
    eyeSquintRight: 0.12,
    browInnerUp: 0.08,
    cheekSquintLeft: 0.15,
    cheekSquintRight: 0.15,
  },
  smile: {
    browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.1700000727403593,
    noseSneerRight: 0.14000002836874015,
    mouthPressLeft: 0.61,
    mouthPressRight: 0.41000000000000003,
  },
  funnyFace: {
    jawLeft: 0.63,
    mouthPucker: 0.53,
    noseSneerLeft: 1,
    noseSneerRight: 0.39,
    mouthLeft: 1,
    eyeLookUpLeft: 1,
    eyeLookUpRight: 1,
    cheekPuff: 0.9999924982764238,
    mouthDimpleLeft: 0.414743888682652,
    mouthRollLower: 0.32,
    mouthSmileLeft: 0.35499733688813034,
    mouthSmileRight: 0.35499733688813034,
  },
  sad: {
    mouthFrownLeft: 1,
    mouthFrownRight: 1,
    mouthShrugLower: 0.78341,
    browInnerUp: 0.452,
    eyeSquintLeft: 0.72,
    eyeSquintRight: 0.75,
    eyeLookDownLeft: 0.5,
    eyeLookDownRight: 0.5,
    jawForward: 1,
  },
  surprised: {
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    jawOpen: 0.351,
    mouthFunnel: 1,
    browInnerUp: 1,
  },
  angry: {
    browDownLeft: 1,
    browDownRight: 1,
    eyeSquintLeft: 1,
    eyeSquintRight: 1,
    jawForward: 1,
    jawLeft: 1,
    mouthShrugLower: 1,
    noseSneerLeft: 1,
    noseSneerRight: 0.42,
    eyeLookDownLeft: 0.16,
    eyeLookDownRight: 0.16,
    cheekSquintLeft: 1,
    cheekSquintRight: 1,
    mouthClose: 0.23,
    mouthFunnel: 0.63,
    mouthDimpleRight: 1,
  },
  crazy: {
    browInnerUp: 0.9,
    jawForward: 1,
    noseSneerLeft: 0.5700000000000001,
    noseSneerRight: 0.51,
    eyeLookDownLeft: 0.39435766259644545,
    eyeLookUpRight: 0.4039761421719682,
    eyeLookInLeft: 0.9618479575523053,
    eyeLookInRight: 0.9618479575523053,
    jawOpen: 0.9618479575523053,
    mouthDimpleLeft: 0.9618479575523053,
    mouthDimpleRight: 0.9618479575523053,
    mouthStretchLeft: 0.27893590769016857,
    mouthStretchRight: 0.2885543872656917,
    mouthSmileLeft: 0.5578718153803371,
    mouthSmileRight: 0.38473918302092225,
    tongueOut: 0.9618479575523053,
  },
  // 🩺 Doctor-specific expressions
  thinking: {
    browInnerUp: 0.65,
    eyeLookUpLeft: 0.35,
    eyeLookUpRight: 0.35,
    mouthPressLeft: 0.25,
    mouthPressRight: 0.25,
    eyeSquintLeft: 0.15,
    eyeSquintRight: 0.15,
  },
  concerned: {
    browDownLeft: 0.35,
    browDownRight: 0.35,
    browInnerUp: 0.55,
    mouthFrownLeft: 0.3,
    mouthFrownRight: 0.3,
    eyeSquintLeft: 0.2,
    eyeSquintRight: 0.2,
  },
  nodding: {
    browInnerUp: 0.12,
    eyeSquintLeft: 0.22,
    eyeSquintRight: 0.22,
    mouthSmileLeft: 0.25,
    mouthSmileRight: 0.25,
    mouthPressLeft: 0.1,
    mouthPressRight: 0.1,
  },
};

const corresponding = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_AA",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP",
};

let setupMode = false;

// ── 🩺 3D Clinical Doctor Accessories (Stethoscope, Glasses, Tied Hair, ID Badge) ────
function DoctorAccessories({ spineNode, headNode }) {
  const spineRef = useRef();
  const headRef = useRef();

  const tempVecSpine = useMemo(() => new THREE.Vector3(), []);
  const tempQuatSpine = useMemo(() => new THREE.Quaternion(), []);
  const tempVecHead = useMemo(() => new THREE.Vector3(), []);
  const tempQuatHead = useMemo(() => new THREE.Quaternion(), []);

  // Anatomically shaped 3M Littmann style stethoscope tubing looping over shoulders and neck
  const stethoscopeCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.125, -0.045),
      new THREE.Vector3(-0.068, 0.105, 0.005),
      new THREE.Vector3(-0.082, 0.05, 0.065),
      new THREE.Vector3(-0.065, -0.04, 0.098),
      new THREE.Vector3(-0.035, -0.11, 0.11),
      new THREE.Vector3(0, -0.14, 0.115),
      new THREE.Vector3(0.035, -0.11, 0.11),
      new THREE.Vector3(0.065, -0.04, 0.098),
      new THREE.Vector3(0.082, 0.05, 0.065),
      new THREE.Vector3(0.068, 0.105, 0.005),
      new THREE.Vector3(0, 0.125, -0.045)
    ]);
  }, []);

  const extensionCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.14, 0.115),
      new THREE.Vector3(0.015, -0.175, 0.12),
      new THREE.Vector3(0.025, -0.21, 0.122)
    ]);
  }, []);

  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(stethoscopeCurve, 64, 0.0055, 12, false), [stethoscopeCurve]);
  const extGeometry = useMemo(() => new THREE.TubeGeometry(extensionCurve, 24, 0.0045, 10, false), [extensionCurve]);

  // 🏷️ Crisp Hospital ID Badge Texture (SANJEEVNI AI • AI HEALTHCARE ASSISTANT)
  const badgeTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");

    // White Card Base
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 512, 720);

    // Subtle edge border
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 710);

    // Header Teal Banner
    ctx.fillStyle = "#0D9488";
    ctx.fillRect(0, 0, 512, 160);

    // SANJEEVNI AI Title
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 50px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SANJEEVNI AI", 256, 100);

    // Sub-banner
    ctx.fillStyle = "#0F766E";
    ctx.fillRect(0, 160, 512, 65);
    ctx.fillStyle = "#CCFBF1";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.fillText("AI HEALTHCARE ASSISTANT", 256, 203);

    // Doctor photo / emblem frame
    ctx.fillStyle = "#F8FAFC";
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 4;
    ctx.fillRect(156, 255, 200, 200);
    ctx.strokeRect(156, 255, 200, 200);

    // Medical Red Cross inside photo box
    ctx.fillStyle = "#EF4444";
    ctx.fillRect(236, 290, 40, 130);
    ctx.fillRect(191, 335, 130, 40);

    // Doctor Name & Credentials
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.fillText("DR. SANJEEVNI", 256, 515);

    ctx.fillStyle = "#0D9488";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText("CLINICAL AI PRACTITIONER", 256, 555);

    // Department & Badge ID
    ctx.fillStyle = "#64748B";
    ctx.font = "18px monospace";
    ctx.fillText("ID: SNJ-2026-AI • OPD GENERAL", 256, 615);

    // Golden Security Microchip
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(226, 640, 60, 40);
    ctx.strokeStyle = "#B45309";
    ctx.lineWidth = 2;
    ctx.strokeRect(226, 640, 60, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    return texture;
  }, []);

  // Synchronize accessories to skeleton bones on each render frame
  useFrame(() => {
    if (spineRef.current && spineNode) {
      spineNode.getWorldPosition(tempVecSpine);
      spineNode.getWorldQuaternion(tempQuatSpine);
      spineRef.current.position.copy(tempVecSpine);
      spineRef.current.quaternion.copy(tempQuatSpine);
    }
    if (headRef.current && headNode) {
      headNode.getWorldPosition(tempVecHead);
      headNode.getWorldQuaternion(tempQuatHead);
      headRef.current.position.copy(tempVecHead);
      headRef.current.quaternion.copy(tempQuatHead);
    }
  });

  return (
    <>
      {/* ── 🩺 Torso & Coat Accessories (Stethoscope, Inner Scrub, Pocket Tools, Badge) ── */}
      <group ref={spineRef}>
        {/* 🩺 Stethoscope Flexible Medical Tubing (Navy / Sapphire Rubber) */}
        <mesh geometry={tubeGeometry}>
          <meshStandardMaterial color="#0369A1" roughness={0.35} metalness={0.15} />
        </mesh>

        {/* Chestpiece extension tube */}
        <mesh geometry={extGeometry}>
          <meshStandardMaterial color="#0369A1" roughness={0.35} metalness={0.15} />
        </mesh>

        {/* Binaural metal tension spring & yoke */}
        <mesh position={[0, 0.125, -0.04]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, 0.035, 16]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
        </mesh>

        {/* 🩺 Stethoscope Dual-Sided Heavy Acoustic Chestpiece */}
        <group position={[0.025, -0.21, 0.122]} rotation={[Math.PI / 2, 0, 0]}>
          {/* Chrome outer casing */}
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.009, 32]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.98} roughness={0.1} />
          </mesh>
          {/* Dark surgical non-chill rim */}
          <mesh position={[0, 0.0045, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.019, 0.002, 8, 32]} />
            <meshStandardMaterial color="#0F172A" roughness={0.8} />
          </mesh>
          {/* Inner tunable diaphragm membrane */}
          <mesh position={[0, 0.005, 0]}>
            <cylinderGeometry args={[0.017, 0.017, 0.0015, 32]} />
            <meshStandardMaterial color="#38BDF8" metalness={0.3} roughness={0.35} />
          </mesh>
          {/* Pediatric bell on reverse side */}
          <mesh position={[0, -0.0055, 0]}>
            <cylinderGeometry args={[0.013, 0.013, 0.003, 24]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
          </mesh>
        </group>

        {/* 🩺 Chrome Binaural Tubes rising towards ears */}
        <mesh position={[-0.048, 0.17, -0.018]} rotation={[0.2, 0, -0.14]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.085, 16]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0.048, 0.17, -0.018]} rotation={[0.2, 0, 0.14]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.085, 16]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Soft Silicone Ear Tips */}
        <mesh position={[-0.058, 0.21, -0.008]}>
          <sphereGeometry args={[0.005, 12, 12]} />
          <meshStandardMaterial color="#0F172A" roughness={0.8} />
        </mesh>
        <mesh position={[0.058, 0.21, -0.008]}>
          <sphereGeometry args={[0.005, 12, 12]} />
          <meshStandardMaterial color="#0F172A" roughness={0.8} />
        </mesh>

        {/* 🥼 Inner Surgical V-Neck Scrub (under white lab coat collar) */}
        <group position={[0, 0.02, 0.088]} rotation={[0.12, 0, 0]}>
          {/* Left V-neck collar band */}
          <mesh position={[-0.03, 0, 0]} rotation={[0, 0, 0.45]}>
            <boxGeometry args={[0.012, 0.085, 0.004]} />
            <meshStandardMaterial color="#0D9488" roughness={0.7} />
          </mesh>
          {/* Right V-neck collar band */}
          <mesh position={[0.03, 0, 0]} rotation={[0, 0, -0.45]}>
            <boxGeometry args={[0.012, 0.085, 0.004]} />
            <meshStandardMaterial color="#0D9488" roughness={0.7} />
          </mesh>
          {/* Inner chest scrub panel */}
          <mesh position={[0, -0.018, -0.002]}>
            <boxGeometry args={[0.065, 0.075, 0.002]} />
            <meshStandardMaterial color="#0D9488" roughness={0.75} />
          </mesh>
        </group>

        {/* 🥼 Coat Chest Pocket with Clinical Instruments & ID Badge */}
        <group position={[-0.086, -0.02, 0.108]} rotation={[0, 0.18, -0.04]}>
          {/* Pocket hem line */}
          <mesh position={[0, 0.032, 0.001]}>
            <boxGeometry args={[0.052, 0.005, 0.003]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.9} />
          </mesh>

          {/* Clinical Diagnostic Penlight */}
          <mesh position={[0.016, 0.038, 0.005]} rotation={[0.08, 0, -0.05]}>
            <cylinderGeometry args={[0.0026, 0.0026, 0.042, 12]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.15} />
          </mesh>

          {/* Medical Charting Pen (Blue Cap Clip) */}
          <mesh position={[0.008, 0.04, 0.005]} rotation={[0.08, 0, 0.04]}>
            <cylinderGeometry args={[0.0024, 0.0024, 0.045, 12]} />
            <meshStandardMaterial color="#1D4ED8" roughness={0.4} />
          </mesh>

          {/* 🏷️ Doctor's Official Hospital ID Badge (SANJEEVNI AI) */}
          <group position={[0, 0, 0.002]}>
            {/* Silver badge clip */}
            <mesh position={[0, 0.038, 0.002]}>
              <boxGeometry args={[0.012, 0.008, 0.004]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* White laminate card body with crisp SANJEEVNI AI branding */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.046, 0.066, 0.002]} />
              <meshStandardMaterial map={badgeTexture} roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── 👓 Head Accessories (Doctor Reading Glasses & Tied Medical Hair) ── */}
      <group ref={headRef}>
        {/* 👓 Professional Doctor Titanium Reading Glasses */}
        <group position={[0, 0.086, 0.072]}>
          {/* Nose Bridge */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0014, 0.0014, 0.018, 8]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
          </mesh>

          {/* Left Rim */}
          <mesh position={[0.034, 0, 0]}>
            <torusGeometry args={[0.016, 0.0015, 8, 32]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Left Prescription Lens */}
          <mesh position={[0.034, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.001, 24]} />
            <meshPhysicalMaterial color="#E0F2FE" transparent opacity={0.3} roughness={0.1} transmission={0.7} />
          </mesh>

          {/* Right Rim */}
          <mesh position={[-0.034, 0, 0]}>
            <torusGeometry args={[0.016, 0.0015, 8, 32]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Right Prescription Lens */}
          <mesh position={[-0.034, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.001, 24]} />
            <meshPhysicalMaterial color="#E0F2FE" transparent opacity={0.3} roughness={0.1} transmission={0.7} />
          </mesh>

          {/* Left Temple Arm extending to ear */}
          <mesh position={[0.05, 0.002, -0.04]} rotation={[Math.PI / 2, 0, 0.15]}>
            <cylinderGeometry args={[0.0012, 0.0012, 0.08, 8]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Right Temple Arm extending to ear */}
          <mesh position={[-0.05, 0.002, -0.04]} rotation={[Math.PI / 2, 0, -0.15]}>
            <cylinderGeometry args={[0.0012, 0.0012, 0.08, 8]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
          </mesh>
        </group>

        {/* 🎀 Neat Tied Medical Hair Scrunchie & Polished Clinical Bun */}
        <group position={[0, 0.055, -0.098]}>
          {/* Medical Teal Surgical Hair Scrunchie / Tie */}
          <mesh rotation={[0.2, 0, 0]}>
            <torusGeometry args={[0.024, 0.007, 12, 28]} />
            <meshStandardMaterial color="#0D9488" roughness={0.8} />
          </mesh>
          {/* Tied Hair Bun (Deep Natural Espresso Brunette) */}
          <mesh position={[0, -0.01, -0.015]}>
            <sphereGeometry args={[0.034, 16, 16]} />
            <meshStandardMaterial color="#181412" roughness={0.6} />
          </mesh>
          {/* Chrome hair clasp */}
          <mesh position={[0, 0.01, 0.004]}>
            <boxGeometry args={[0.024, 0.004, 0.004]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>
    </>
  );
}

export function Avatar(props) {
  const { nodes, materials, scene } = useGLTF(
    "/models/64f1a714fe61576b46f27ca2.glb"
  );

  const { message, onMessagePlayed, chat } = useChat();

  const group    = useRef();
  const audioRef = useRef(null);
  const lastPlayedMessageRef = useRef(null);

  // ── All hot refs so useFrame never has stale closures ─────────────────────
  const lipsyncRef          = useRef(null);
  const facialExpressionRef = useRef("default");
  const pendingAudioRef     = useRef(null);
  // FIX: keep a ref for "is there an active message" so useFrame doesn't
  // depend on the React state variable (which can be stale inside useFrame)
  const hasMessageRef       = useRef(false);

  const [lipsync,          setLipsyncState]          = useState(null);
  const [facialExpression, setFacialExpressionState] = useState("default");
  const [blink,     setBlink]     = useState(false);
  const [winkLeft,  setWinkLeft]  = useState(false);
  const [winkRight, setWinkRight] = useState(false);

  // Always update ref AND state together
  const setLipsync = (v) => {
    lipsyncRef.current = v;
    setLipsyncState(v);
  };
  const setFacialExpression = (v) => {
    facialExpressionRef.current = v;
    setFacialExpressionState(v);
  };

  const animationGltf = useGLTF("/models/animations.glb");

  // ── Animation (from file 2) ────────────────────────────────────────────────
  const cleanedAnimations = useMemo(() => {
    return animationGltf.animations
      .map((clip) => {
        const validTracks = clip.tracks.filter((track) => {
          return !(
            track.name === "Armature.position" ||
            track.name === "Armature.quaternion" ||
            track.name === "Armature.scale"
          );
        });
        return new THREE.AnimationClip(clip.name, clip.duration, validTracks);
      })
      .filter((clip) => clip.tracks.length > 0);
  }, [animationGltf.animations]);

  const { actions } = useAnimations(cleanedAnimations, group);

  const animationNames = useMemo(
    () => cleanedAnimations.map((clip) => clip.name),
    [cleanedAnimations]
  );

  const [animation, setAnimation] = useState("");

  useEffect(() => {
    if (animationNames.length === 0) return;
    setAnimation((prev) => {
      if (prev && animationNames.includes(prev)) return prev;
      if (animationNames.includes("Idle")) return "Idle";
      return animationNames[0];
    });
  }, [animationNames]);

  // ── 🩺 Doctor Medical Wardrobe & Realistic PBR Appearance Transformation ──────────
  useEffect(() => {
    if (materials?.Wolf3D_Outfit_Top) {
      // Crisp Medical Doctor White Lab Coat
      materials.Wolf3D_Outfit_Top.color = new THREE.Color("#FFFFFF");
      materials.Wolf3D_Outfit_Top.roughness = 0.82;
      materials.Wolf3D_Outfit_Top.metalness = 0.02;
      if (materials.Wolf3D_Outfit_Top.map) {
        materials.Wolf3D_Outfit_Top.map = null;
      }
      materials.Wolf3D_Outfit_Top.needsUpdate = true;
    }

    if (materials?.Wolf3D_Outfit_Bottom) {
      // Elegant Teal Medical Scrub Pants
      materials.Wolf3D_Outfit_Bottom.color = new THREE.Color("#0F766E");
      materials.Wolf3D_Outfit_Bottom.roughness = 0.78;
      materials.Wolf3D_Outfit_Bottom.metalness = 0.02;
      if (materials.Wolf3D_Outfit_Bottom.map) {
        materials.Wolf3D_Outfit_Bottom.map = null;
      }
      materials.Wolf3D_Outfit_Bottom.needsUpdate = true;
    }

    if (materials?.Wolf3D_Outfit_Footwear) {
      // Polished Clinical Medical Footwear
      materials.Wolf3D_Outfit_Footwear.color = new THREE.Color("#0F172A");
      materials.Wolf3D_Outfit_Footwear.roughness = 0.4;
      materials.Wolf3D_Outfit_Footwear.needsUpdate = true;
    }

    if (materials?.Wolf3D_Hair) {
      // Naturally styled black / dark espresso hair
      materials.Wolf3D_Hair.color = new THREE.Color("#121110");
      materials.Wolf3D_Hair.roughness = 0.52;
      materials.Wolf3D_Hair.metalness = 0.04;
      if (materials.Wolf3D_Hair.map) {
        materials.Wolf3D_Hair.map = null;
      }
      materials.Wolf3D_Hair.needsUpdate = true;
    }

    if (materials?.Wolf3D_Skin) {
      // Natural medium Indian skin tone with subtle warm undertones (non-plastic)
      materials.Wolf3D_Skin.color = new THREE.Color("#D89F75");
      materials.Wolf3D_Skin.roughness = 0.62;
      materials.Wolf3D_Skin.metalness = 0.0;
      materials.Wolf3D_Skin.needsUpdate = true;
    }

    if (materials?.Wolf3D_Body) {
      // Matching natural medium Indian skin tone for hands and exposed skin
      materials.Wolf3D_Body.color = new THREE.Color("#D89F75");
      materials.Wolf3D_Body.roughness = 0.62;
      materials.Wolf3D_Body.metalness = 0.0;
      materials.Wolf3D_Body.needsUpdate = true;
    }

    if (materials?.Wolf3D_Eye) {
      // Expressive dark brown eyes with clear reflective cornea
      materials.Wolf3D_Eye.color = new THREE.Color("#3D2214");
      materials.Wolf3D_Eye.roughness = 0.12;
      materials.Wolf3D_Eye.metalness = 0.06;
      materials.Wolf3D_Eye.needsUpdate = true;
    }
  }, [materials]);

  // ── Unlock AudioContext for autoplay inside iframe ─────────────────────────
  const unlockAndPlay = (audio) => {
    const attempt = audio.play();
    if (!attempt) return;
    attempt.catch(() => {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { onMessagePlayed(); return; }
      const ctx = new AC();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      ctx.resume().then(() => {
        audio.play().catch((e) => {
          console.error("Audio still blocked:", e);
          onMessagePlayed();
        });
      });
    });
  };

  // ── Main message handler ───────────────────────────────────────────────────
  useEffect(() => {
    if (!message) {
      hasMessageRef.current = false;
      setAnimation(animationNames.includes("Idle") ? "Idle" : animationNames[0] || "");
      setFacialExpression("default");
      setLipsync(null);

      if (pendingAudioRef.current) pendingAudioRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      return;
    }

    hasMessageRef.current = true;

    if (message.animation && animationNames.includes(message.animation)) {
      setAnimation(message.animation);
    } else if (animationNames.includes("Idle")) {
      setAnimation("Idle");
    }

    const expr = message.facialExpression || "default";
    setFacialExpression(expr);
    console.log("😊 Expression:", expr);

    const ls = message.lipsync || null;
    setLipsync(ls);
    console.log("👄 Lipsync cues:", ls?.mouthCues?.length ?? 0);

    const messageKey = `${message.text || ""}_${message.audio?.slice(0, 40) || ""}`;
    if (lastPlayedMessageRef.current === messageKey) return;
    lastPlayedMessageRef.current = messageKey;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    pendingAudioRef.current = null;

    if (!message.audio) {
      // 🔊 Browser TTS fallback — speaks even without Murf
      if (message.text && window.speechSynthesis) {
        window.speechSynthesis.cancel(); // stop any previous
        const utterance = new SpeechSynthesisUtterance(message.text);
        utterance.rate  = 0.88;
        utterance.pitch = 1.05;
        utterance.volume = 1;
        // Pick a voice matching the patient language if possible
        const voices = window.speechSynthesis.getVoices();
        const langPref = document.documentElement.lang || "en-IN";
        const match = voices.find(v => v.lang.startsWith(langPref.slice(0,2)));
        if (match) utterance.voice = match;
        utterance.onend = () => {
          console.log("✅ Browser TTS ended");
          onMessagePlayed();
        };
        utterance.onerror = () => onMessagePlayed();
        window.speechSynthesis.speak(utterance);
      } else {
        onMessagePlayed();
      }
      return;
    }

    const isPythonWav = message._pythonSource === true ||
                        message.audio.startsWith("UklGR") ||
                        message.audio.startsWith("RIFF");

    const mime1 = isPythonWav ? "audio/wav" : "audio/mp3";
    const mime2 = isPythonWav ? "audio/mp3" : "audio/wav";

    console.log("🔊 Audio format:", mime1, "| pythonSource:", !!message._pythonSource);

    const buildAudio = (mime, onFail) => {
      const a = new Audio(`data:${mime};base64,${message.audio}`);
      a.onended = () => {
        console.log("✅ Audio ended");
        onMessagePlayed();
      };
      a.onerror = () => {
        console.warn(mime, "failed — trying fallback");
        if (onFail) onFail();
        else { console.error("All formats failed"); onMessagePlayed(); }
      };
      return a;
    };

    const primaryAudio = buildAudio(mime1, () => {
      const fallback = buildAudio(mime2, null);
      audioRef.current = fallback;
      unlockAndPlay(fallback);
    });

    audioRef.current        = primaryAudio;
    pendingAudioRef.current = primaryAudio;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (pendingAudioRef.current === primaryAudio) {
          pendingAudioRef.current = null;
          const cues = lipsyncRef.current?.mouthCues?.length ?? 0;
          console.log(`▶ Starting audio | lipsync cues ready: ${cues}`);
          unlockAndPlay(primaryAudio);
        }
      });
    });

  }, [message, onMessagePlayed, animationNames]);

  // ── Animation transitions (from file 2) ───────────────────────────────────
  useEffect(() => {
    if (!animation || !actions || !actions[animation]) return;

    Object.values(actions).forEach((action) => {
      if (action && action !== actions[animation]) {
        action.fadeOut(0.2);
        action.stop();
      }
    });

    actions[animation].reset().fadeIn(0.3).play();

    return () => {
      if (actions[animation]) actions[animation].fadeOut(0.2);
    };
  }, [animation, actions]);

  // ── Morph target lerp ──────────────────────────────────────────────────────
  const lerpMorphTarget = (target, value, speed = 0.1) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (index === undefined || child.morphTargetInfluences[index] === undefined) return;
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          child.morphTargetInfluences[index],
          value,
          speed
        );
        if (!setupMode) { try { set({ [target]: value }); } catch (e) {} }
      }
    });
  };

  // ── Idle breathing animation — subtle Y bob when not speaking ────────────
  useFrame(() => {
    if (group.current && !hasMessageRef.current) {
      group.current.position.y =
        Math.sin(Date.now() * 0.0008) * 0.006;
    }
  });

  // ── Per-frame: facial expression + lipsync ────────────────────────────────
  useFrame(() => {
    if (!nodes?.EyeLeft?.morphTargetDictionary) return;

    // Always read from refs — never stale
    const currentExpression = facialExpressionRef.current;
    const currentLipsync    = lipsyncRef.current;
    const currentAudio      = audioRef.current;

    // ── Facial expression morph targets ───────────────────────────────────
    if (!setupMode) {
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") return;
        const mapping = facialExpressions[currentExpression];
        lerpMorphTarget(key, mapping?.[key] ?? 0, 0.1);
      });
    }

    lerpMorphTarget("eyeBlinkLeft",  blink || winkLeft  ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5);

    if (setupMode) return;

    // ── Lipsync morph targets ──────────────────────────────────────────────
    const appliedMorphTargets = [];

    // FIX: use hasMessageRef instead of `message` to avoid stale closure
    if (hasMessageRef.current && currentLipsync && currentAudio) {
      const currentAudioTime = currentAudio.currentTime || 0;

      if (Math.random() < 0.03) {
        console.log(`⏱ Audio time: ${currentAudioTime.toFixed(2)}s | Cues: ${currentLipsync.mouthCues.length}`);
      }

      for (let i = 0; i < currentLipsync.mouthCues.length; i++) {
        const mouthCue = currentLipsync.mouthCues[i];
        if (currentAudioTime >= mouthCue.start && currentAudioTime <= mouthCue.end) {
          const target = corresponding[mouthCue.value];
          if (target) {
            appliedMorphTargets.push(target);
            // FIX: use speed 0.5 instead of 0.2 for snappier mouth movement
            lerpMorphTarget(target, 1, 0.5);
          }
          break;
        }
      }
    }

    // Reset all viseme targets that aren't currently active
    Object.values(corresponding).forEach((value) => {
      if (appliedMorphTargets.includes(value)) return;
      lerpMorphTarget(value, 0, 0.1);
    });
  });

  // ── Leva controls ──────────────────────────────────────────────────────────
  useControls("FacialExpressions", {
    chat: button(() => chat("Hello")),
    winkLeft:  button(() => { setWinkLeft(true);  setTimeout(() => setWinkLeft(false),  300); }),
    winkRight: button(() => { setWinkRight(true); setTimeout(() => setWinkRight(false), 300); }),
    animation: {
      value: animation,
      options: animationNames,
      onChange: (value) => setAnimation(value),
    },
    facialExpression: {
      options: Object.keys(facialExpressions),
      onChange: (value) => setFacialExpression(value),
    },
    enableSetupMode:  button(() => { setupMode = true;  }),
    disableSetupMode: button(() => { setupMode = false; }),
    logMorphTargetValues: button(() => {
      const emotionValues = {};
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") return;
        const value = nodes.EyeLeft.morphTargetInfluences[
          nodes.EyeLeft.morphTargetDictionary[key]
        ];
        if (value > 0.01) emotionValues[key] = value;
      });
      console.log(JSON.stringify(emotionValues, null, 2));
    }),
  });

  const [, set] = useControls("MorphTarget", () =>
    Object.assign(
      {},
      ...Object.keys(nodes.EyeLeft.morphTargetDictionary).map((key) => ({
        [key]: {
          label: key,
          value: 0,
          min: 0,
          max: 1,
          onChange: (val) => { if (setupMode) lerpMorphTarget(key, val, 1); },
        },
      }))
    )
  );

  // ── Blinking ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let blinkTimeout;
    let closeTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        closeTimeout = setTimeout(() => { setBlink(false); nextBlink(); }, 180);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => { clearTimeout(blinkTimeout); clearTimeout(closeTimeout); };
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      <skinnedMesh name="Wolf3D_Body"            geometry={nodes.Wolf3D_Body.geometry}            material={materials.Wolf3D_Body}            skeleton={nodes.Wolf3D_Body.skeleton} />
      <skinnedMesh name="Wolf3D_Outfit_Bottom"   geometry={nodes.Wolf3D_Outfit_Bottom.geometry}   material={materials.Wolf3D_Outfit_Bottom}    skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton} />
      <skinnedMesh name="Wolf3D_Outfit_Footwear" geometry={nodes.Wolf3D_Outfit_Footwear.geometry} material={materials.Wolf3D_Outfit_Footwear}  skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton} />
      <skinnedMesh name="Wolf3D_Outfit_Top"      geometry={nodes.Wolf3D_Outfit_Top.geometry}      material={materials.Wolf3D_Outfit_Top}       skeleton={nodes.Wolf3D_Outfit_Top.skeleton} />
      <skinnedMesh name="Wolf3D_Hair"            geometry={nodes.Wolf3D_Hair.geometry}            material={materials.Wolf3D_Hair}             skeleton={nodes.Wolf3D_Hair.skeleton} />
      <skinnedMesh name="EyeLeft"  geometry={nodes.EyeLeft.geometry}  material={materials.Wolf3D_Eye}   skeleton={nodes.EyeLeft.skeleton}  morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}  morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences} />
      <skinnedMesh name="EyeRight" geometry={nodes.EyeRight.geometry} material={materials.Wolf3D_Eye}   skeleton={nodes.EyeRight.skeleton} morphTargetDictionary={nodes.EyeRight.morphTargetDictionary} morphTargetInfluences={nodes.EyeRight.morphTargetInfluences} />
      <skinnedMesh name="Wolf3D_Head"  geometry={nodes.Wolf3D_Head.geometry}  material={materials.Wolf3D_Skin}  skeleton={nodes.Wolf3D_Head.skeleton}  morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}  morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences} />
      <skinnedMesh name="Wolf3D_Teeth" geometry={nodes.Wolf3D_Teeth.geometry} material={materials.Wolf3D_Teeth} skeleton={nodes.Wolf3D_Teeth.skeleton} morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary} morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences} />

      {/* 🩺 3D Doctor Stethoscope, Hospital Badge & Head Accessories */}
      {nodes.Spine2 && nodes.Head && (
        <DoctorAccessories spineNode={nodes.Spine2} headNode={nodes.Head} />
      )}
    </group>
  );
}

useGLTF.preload("/models/64f1a714fe61576b46f27ca2.glb");
useGLTF.preload("/models/animations.glb");