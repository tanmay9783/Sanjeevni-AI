
import { useAnimations, useGLTF, useTexture } from "@react-three/drei";
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

// ── 🔗 Native Bone Attacher (100% Kinematic Synchronization, Zero Lag) ─────────
function AttachToBone({ bone, children, position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const ref = useRef();
  useEffect(() => {
    if (!bone || !ref.current) return;
    const obj = ref.current;
    bone.add(obj);
    return () => {
      bone.remove(obj);
    };
  }, [bone]);
  return (
    <group ref={ref} position={position} rotation={rotation}>
      {children}
    </group>
  );
}

// ── 🩺 3D Clinical Doctor Accessories (Physician Lab Coat, Scrubs, Stethoscope, ID Badge, Hair) ────
function DoctorAccessories({ spineNode, headNode, hipsNode }) {
  // Clinical gauge stethoscope tubing (4.4mm diameter, Littmann Classic III style)
  // Draped naturally over shoulders and conforming snug against chest surface (Z = +0.118 to +0.134)
  const stethoscopeCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.134, -0.018),       // Behind neck
      new THREE.Vector3(-0.074, 0.116, 0.035),   // Over left shoulder
      new THREE.Vector3(-0.068, 0.030, 0.118),   // Left upper chest
      new THREE.Vector3(-0.042, -0.060, 0.128),  // Left mid chest
      new THREE.Vector3(-0.014, -0.126, 0.132),  // Approaching yoke
      new THREE.Vector3(0, -0.140, 0.134),       // Center yoke junction
      new THREE.Vector3(0.014, -0.126, 0.132),   // Right approach
      new THREE.Vector3(0.042, -0.060, 0.128),   // Right mid chest
      new THREE.Vector3(0.068, 0.030, 0.118),    // Right upper chest
      new THREE.Vector3(0.074, 0.116, 0.035),    // Over right shoulder
      new THREE.Vector3(0, 0.134, -0.018)        // Back behind neck
    ]);
  }, []);

  const extensionCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.140, 0.134),
      new THREE.Vector3(0.010, -0.165, 0.134),
      new THREE.Vector3(0.016, -0.190, 0.134)
    ]);
  }, []);

  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(stethoscopeCurve, 64, 0.0022, 12, false), [stethoscopeCurve]);
  const extGeometry = useMemo(() => new THREE.TubeGeometry(extensionCurve, 20, 0.0020, 10, false), [extensionCurve]);

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

    // Header Dark Teal Banner
    ctx.fillStyle = "#0B4F56";
    ctx.fillRect(0, 0, 512, 160);

    // SANJEEVNI AI Title
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SANJEEVNI AI", 256, 100);

    // Sub-banner
    ctx.fillStyle = "#073B40";
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

    ctx.fillStyle = "#0B4F56";
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

  return (
    <>
      {/* ── 🥼 Torso: Physician Lab Coat, Scrubs, Stethoscope, ID Badge (Spine2-anchored) ── */}
      {spineNode && (
        <AttachToBone bone={spineNode}>
          {/* 🥼 Left Notched Lapel (folded outward over left chest) */}
          <group position={[-0.058, 0.025, 0.122]} rotation={[0.06, -0.08, -0.18]}>
            <mesh position={[0, 0.048, 0]}>
              <boxGeometry args={[0.044, 0.072, 0.007]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
            </mesh>
            <mesh position={[-0.006, -0.052, 0]}>
              <boxGeometry args={[0.050, 0.120, 0.007]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
            </mesh>
          </group>

          {/* 🥼 Right Notched Lapel (folded outward over right chest) */}
          <group position={[0.058, 0.025, 0.122]} rotation={[0.06, 0.08, 0.18]}>
            <mesh position={[0, 0.048, 0]}>
              <boxGeometry args={[0.044, 0.072, 0.007]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
            </mesh>
            <mesh position={[0.006, -0.052, 0]}>
              <boxGeometry args={[0.050, 0.120, 0.007]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.85} />
            </mesh>
          </group>

          {/* 🥼 White Physician Front Coat Buttons */}
          <mesh position={[0.044, 0.01, 0.124]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.004, 16]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
          </mesh>
          <mesh position={[0.044, -0.06, 0.125]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.004, 16]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
          </mesh>
          <mesh position={[0.044, -0.13, 0.126]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.004, 16]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
          </mesh>

          {/* 🥼 Inner Dark Teal Medical Scrubs V-Neck (under coat, conforming to chest) */}
          <group position={[0, -0.01, 0.116]} rotation={[0.06, 0, 0]}>
            {/* Left V-neck collar trim band */}
            <mesh position={[-0.034, 0.045, 0.003]} rotation={[0, 0, 0.42]}>
              <boxGeometry args={[0.016, 0.14, 0.004]} />
              <meshStandardMaterial color="#084C53" roughness={0.80} />
            </mesh>
            {/* Right V-neck collar trim band */}
            <mesh position={[0.034, 0.045, 0.003]} rotation={[0, 0, -0.42]}>
              <boxGeometry args={[0.016, 0.14, 0.004]} />
              <meshStandardMaterial color="#084C53" roughness={0.80} />
            </mesh>
            {/* Inner scrub chest fabric */}
            <mesh position={[0, -0.035, 0]}>
              <boxGeometry args={[0.115, 0.23, 0.003]} />
              <meshStandardMaterial color="#084C53" roughness={0.85} />
            </mesh>
          </group>

          {/* 🩺 Classic Black Medical Rubber Stethoscope (Littmann Classic III style) */}
          {/* Main Tubing */}
          <mesh geometry={tubeGeometry}>
            <meshStandardMaterial color="#111111" roughness={0.45} metalness={0.08} />
          </mesh>
          {/* Extension Tube */}
          <mesh geometry={extGeometry}>
            <meshStandardMaterial color="#111111" roughness={0.45} metalness={0.08} />
          </mesh>

          {/* Binaural metal tension spring behind neck */}
          <mesh position={[0, 0.134, -0.015]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0026, 0.0026, 0.04, 16]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.96} roughness={0.12} />
          </mesh>

          {/* 🩺 Stethoscope Dual-Sided Chrome Acoustic Chestpiece (32mm clinical diameter) */}
          <group position={[0.016, -0.192, 0.134]} rotation={[Math.PI / 2, 0, 0]}>
            {/* Acoustic Connecting Stem */}
            <mesh position={[0, -0.007, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.010, 16]} />
              <meshStandardMaterial color="#FFFFFF" metalness={0.98} roughness={0.08} />
            </mesh>
            {/* Outer Chrome Body */}
            <mesh>
              <cylinderGeometry args={[0.016, 0.016, 0.007, 32]} />
              <meshStandardMaterial color="#FFFFFF" metalness={0.98} roughness={0.08} />
            </mesh>
            {/* Dark non-chill rim */}
            <mesh position={[0, 0.0036, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.0152, 0.0016, 8, 32]} />
              <meshStandardMaterial color="#111111" roughness={0.8} />
            </mesh>
            {/* Tunable Diaphragm Membrane (Sky Blue) */}
            <mesh position={[0, 0.0039, 0]}>
              <cylinderGeometry args={[0.0145, 0.0145, 0.001, 32]} />
              <meshStandardMaterial color="#38BDF8" metalness={0.3} roughness={0.35} />
            </mesh>
            {/* Reverse pediatric bell */}
            <mesh position={[0, -0.0045, 0]}>
              <cylinderGeometry args={[0.011, 0.011, 0.003, 24]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
            </mesh>
          </group>

          {/* 🩺 Chrome Binaural Tubes rising towards ears */}
          <mesh position={[-0.044, 0.175, 0.045]} rotation={[0.2, 0, -0.14]}>
            <cylinderGeometry args={[0.0022, 0.0022, 0.085, 16]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.96} roughness={0.12} />
          </mesh>
          <mesh position={[0.044, 0.175, 0.045]} rotation={[0.2, 0, 0.14]}>
            <cylinderGeometry args={[0.0022, 0.0022, 0.085, 16]} />
            <meshStandardMaterial color="#E2E8F0" metalness={0.96} roughness={0.12} />
          </mesh>
          {/* Black Silicone Ear Tips */}
          <mesh position={[-0.050, 0.218, 0.055]}>
            <sphereGeometry args={[0.0042, 12, 12]} />
            <meshStandardMaterial color="#111111" roughness={0.8} />
          </mesh>
          <mesh position={[0.050, 0.218, 0.055]}>
            <sphereGeometry args={[0.0042, 12, 12]} />
            <meshStandardMaterial color="#111111" roughness={0.8} />
          </mesh>

          {/* 🥼 Coat Upper Chest Pocket with Clinical Pen & Official ID Badge */}
          <group position={[-0.086, -0.02, 0.124]} rotation={[0, 0.12, -0.04]}>
            {/* Pocket welt stitch border */}
            <mesh position={[0, 0.035, 0.001]}>
              <boxGeometry args={[0.054, 0.005, 0.004]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.9} />
            </mesh>
            {/* Clinical Diagnostic Silver Pen */}
            <mesh position={[0.014, 0.042, 0.006]} rotation={[0.08, 0, -0.05]}>
              <cylinderGeometry args={[0.0028, 0.0028, 0.046, 12]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.15} />
            </mesh>
            {/* 🏷️ Doctor's Official Hospital ID Badge (SANJEEVNI AI) */}
            <group position={[0, 0, 0.006]}>
              <mesh position={[0, 0.038, 0.002]}>
                <boxGeometry args={[0.014, 0.009, 0.004]} />
                <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.048, 0.068, 0.003]} />
                <meshStandardMaterial map={badgeTexture} roughness={0.3} />
              </mesh>
            </group>
          </group>
        </AttachToBone>
      )}

      {/* ── 🥼 Lower Knee-Length Doctor Coat Skirt & Lower Medical Pockets (Hips-anchored) ── */}
      {hipsNode && (
        <AttachToBone bone={hipsNode}>
          {/* Anatomically Contoured Elliptical Lab Coat Mantle (scale Z=0.48, hugging pelvis/thighs naturally) */}
          <mesh position={[0, -0.22, 0.00]} scale={[1.0, 1.0, 0.48]}>
            <cylinderGeometry args={[0.185, 0.205, 0.44, 32, 1, true, 0.42, Math.PI * 2 - 0.84]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>

          {/* Left Lower Medical Patch Pocket (85mm x 105mm) */}
          <mesh position={[-0.125, -0.20, 0.082]} rotation={[0, 0.22, -0.02]}>
            <boxGeometry args={[0.085, 0.105, 0.006]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.88} />
          </mesh>

          {/* Right Lower Medical Patch Pocket (85mm x 105mm) */}
          <mesh position={[0.125, -0.20, 0.082]} rotation={[0, -0.22, 0.02]}>
            <boxGeometry args={[0.085, 0.105, 0.006]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.88} />
          </mesh>

          {/* Lower Front Coat Buttons (continuing physician closure line) */}
          <mesh position={[0.046, -0.08, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.004, 16]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
          </mesh>
          <mesh position={[0.048, -0.16, 0.088]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.004, 16]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
          </mesh>
        </AttachToBone>
      )}

      {/* ── 🎀 Head & Hairstyle: Sleek Low Ponytail / Professional Bun at Nape ── */}
      {headNode && (
        <AttachToBone bone={headNode}>
          <group position={[0, 0.015, -0.098]}>
            {/* Black Hair Tie Band */}
            <mesh rotation={[0.25, 0, 0]}>
              <torusGeometry args={[0.02, 0.006, 12, 28]} />
              <meshStandardMaterial color="#18181B" roughness={0.8} />
            </mesh>
            {/* Neatly tied low ponytail / bun (Natural Black Hair) */}
            <mesh position={[0, -0.012, -0.015]}>
              <sphereGeometry args={[0.036, 16, 16]} />
              <meshStandardMaterial color="#141312" roughness={0.55} />
            </mesh>
            {/* Ponytail lower tail resting neatly against upper nape */}
            <mesh position={[0, -0.05, -0.018]} rotation={[0.1, 0, 0]}>
              <cylinderGeometry args={[0.014, 0.008, 0.08, 12]} />
              <meshStandardMaterial color="#141312" roughness={0.55} />
            </mesh>
          </group>
        </AttachToBone>
      )}
    </>
  );
}

export function Avatar(props) {
  const { nodes, materials, scene } = useGLTF(
    "/models/64f1a714fe61576b46f27ca2.glb"
  );
  const [faceTexture, eyeTexture] = useTexture([
    "/models/doctor_face.png",
    "/models/doctor_eye.png",
  ]);

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

  const [animation, setAnimation] = useState("Idle");

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
      // Dark Teal Medical Scrub Trousers (matching reference photo)
      materials.Wolf3D_Outfit_Bottom.color = new THREE.Color("#084C53");
      materials.Wolf3D_Outfit_Bottom.roughness = 0.90;
      materials.Wolf3D_Outfit_Bottom.metalness = 0.01;
      if (materials.Wolf3D_Outfit_Bottom.map) {
        materials.Wolf3D_Outfit_Bottom.map = null;
      }
      materials.Wolf3D_Outfit_Bottom.needsUpdate = true;
    }

    if (nodes?.Wolf3D_Outfit_Top?.geometry) {
      // Cleanly remove dress skirt triangles (Y < 1.025) and high wrap-dress collar triangles (Y > 1.45)
      // This leaves a clean, tailored doctor coat bodice with zero neck spikes or wrap-dress flaps
      const geom = nodes.Wolf3D_Outfit_Top.geometry;
      if (geom.index && !geom.userData.processedDoctorCoat) {
        geom.userData.processedDoctorCoat = true;
        const pos = geom.attributes.position;
        const origIndices = geom.index.array;
        const kept = [];
        for (let i = 0; i < origIndices.length; i += 3) {
          const i0 = origIndices[i];
          const i1 = origIndices[i + 1];
          const i2 = origIndices[i + 2];
          const isSkirt = pos.getY(i0) < 1.025 && pos.getY(i1) < 1.025 && pos.getY(i2) < 1.025;
          const isCollar = pos.getY(i0) > 1.45 && pos.getY(i1) > 1.45 && pos.getY(i2) > 1.45;
          if (!isSkirt && !isCollar) {
            kept.push(i0, i1, i2);
          }
        }
        geom.setIndex(new THREE.BufferAttribute(new Uint16Array(kept), 1));
        geom.computeVertexNormals();
      }
    }

    if (nodes?.Wolf3D_Outfit_Footwear?.geometry && materials?.Wolf3D_Outfit_Footwear) {
      // Slenderize footwear boot shaft to straight-leg scrub trousers & turn feet into white medical sneakers
      const geom = nodes.Wolf3D_Outfit_Footwear.geometry;
      const pos = geom.attributes.position;
      if (pos) {
        const scrubColor = new THREE.Color("#084C53");
        const colors = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          let x = pos.getX(i);
          const y = pos.getY(i);
          let z = pos.getZ(i);

          if (y >= 0.088) {
            // Straight-leg scrub trousers:
            // Slenderize chunky boot shaft to anatomical scrub trouser profile
            const isLeft = x < 0;
            const xc = isLeft ? -0.1669 : 0.1669;
            const zc = -0.0199;
            const dx = x - xc;
            const dz = z - zc;
            const r = Math.sqrt(dx * dx + dz * dz);
            const rMax = 0.052 + 0.004 * (y / 0.45);
            if (r > rMax && r > 0.001) {
              const scale = rMax / r;
              pos.setXYZ(i, xc + dx * scale, y, zc + dz * scale);
            }
            colors[i * 3 + 0] = scrubColor.r;
            colors[i * 3 + 1] = scrubColor.g;
            colors[i * 3 + 2] = scrubColor.b;
          } else {
            // Clean white medical athletic sneakers with light gray rubber sole
            const isSole = y < 0.024;
            colors[i * 3 + 0] = isSole ? 0.88 : 1.0;
            colors[i * 3 + 1] = isSole ? 0.91 : 1.0;
            colors[i * 3 + 2] = isSole ? 0.94 : 1.0;
          }
        }
        pos.needsUpdate = true;
        geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geom.computeVertexNormals();
      }
      materials.Wolf3D_Outfit_Footwear.vertexColors = true;
      materials.Wolf3D_Outfit_Footwear.color = new THREE.Color(1, 1, 1);
      materials.Wolf3D_Outfit_Footwear.roughness = 0.85;
      materials.Wolf3D_Outfit_Footwear.metalness = 0.01;
      materials.Wolf3D_Outfit_Footwear.map = null;
      materials.Wolf3D_Outfit_Footwear.normalMap = null;
      materials.Wolf3D_Outfit_Footwear.roughnessMap = null;
      materials.Wolf3D_Outfit_Footwear.metalnessMap = null;
      materials.Wolf3D_Outfit_Footwear.needsUpdate = true;
    }

    if (materials?.Wolf3D_Hair) {
      // Naturally styled black / dark espresso hair
      materials.Wolf3D_Hair.color = new THREE.Color("#141312");
      materials.Wolf3D_Hair.roughness = 0.55;
      materials.Wolf3D_Hair.metalness = 0.04;
      if (materials.Wolf3D_Hair.map) {
        materials.Wolf3D_Hair.map = null;
      }
      materials.Wolf3D_Hair.needsUpdate = true;
    }

    if (materials?.Wolf3D_Skin && faceTexture) {
      faceTexture.encoding = THREE.sRGBEncoding;
      faceTexture.flipY = false;
      materials.Wolf3D_Skin.map = faceTexture;
      // Natural warm medium Indian golden-olive skin tone
      materials.Wolf3D_Skin.color = new THREE.Color("#C88E62");
      materials.Wolf3D_Skin.roughness = 0.68;
      materials.Wolf3D_Skin.metalness = 0.0;
      materials.Wolf3D_Skin.needsUpdate = true;
    }

    if (materials?.Wolf3D_Body) {
      // Matching natural medium Indian skin tone for hands and neck
      materials.Wolf3D_Body.color = new THREE.Color("#C88E62");
      materials.Wolf3D_Body.roughness = 0.68;
      materials.Wolf3D_Body.metalness = 0.0;
      materials.Wolf3D_Body.needsUpdate = true;
    }

    if (materials?.Wolf3D_Eye && eyeTexture) {
      eyeTexture.encoding = THREE.sRGBEncoding;
      eyeTexture.flipY = false;
      materials.Wolf3D_Eye.map = eyeTexture;
      materials.Wolf3D_Eye.color = new THREE.Color(1, 1, 1);
      materials.Wolf3D_Eye.roughness = 0.08;
      materials.Wolf3D_Eye.metalness = 0.04;
      materials.Wolf3D_Eye.needsUpdate = true;
    }
  }, [materials, nodes, faceTexture, eyeTexture]);

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

  // ── Animation transitions ───────────────────────────────────────────────────
  useEffect(() => {
    const animName = animation || "Idle";
    if (!actions || !actions[animName]) return;

    Object.keys(actions).forEach((name) => {
      if (name !== animName && actions[name]?.isRunning()) {
        actions[name].fadeOut(0.2);
      }
    });

    const action = actions[animName];
    action.reset().fadeIn(0.15).play();

    return () => {
      if (action) action.fadeOut(0.2);
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

  // ── Automated Verification Capture ───────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("avatarPreview")) {
      const timer = setTimeout(() => {
        const canvas = document.querySelector("canvas");
        if (canvas) {
          try {
            const dataUrl = canvas.toDataURL("image/png");
            fetch("/api/save-screenshot", {
              method: "POST",
              headers: { "Content-Type": "text/plain" },
              body: dataUrl,
            }).then(() => console.log("Screenshot successfully saved to server"))
              .catch(e => console.warn("Screenshot post failed", e));
          } catch (e) {
            console.warn("toDataURL error", e);
          }
        }
      }, 3500);
      return () => clearTimeout(timer);
    }
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

      {/* 🩺 3D Doctor Stethoscope, Hospital Badge, Lab Coat, Scrubs & Medical Shoes */}
      {nodes.Spine2 && (
        <DoctorAccessories
          spineNode={nodes.Spine2}
          headNode={nodes.Head}
          hipsNode={nodes.Hips}
        />
      )}
    </group>
  );
}

useGLTF.preload("/models/64f1a714fe61576b46f27ca2.glb");
useGLTF.preload("/models/animations.glb");
useTexture.preload("/models/doctor_face.png");
useTexture.preload("/models/doctor_eye.png");