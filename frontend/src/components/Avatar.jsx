import React, { useEffect, useRef, useState, useMemo } from "react";
import { useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { button, useControls } from "leva";
import * as THREE from "three";
import { useChat } from "../hooks/useChat";
import {
  createLabCoatGeometry,
  createScrubTopGeometry,
  createScrubTrousersGeometry,
  createSneakersGeometry,
  createStethoscopeGeometry,
  createIDBadgeGeometry,
  createPonytailHairGeometry,
  getDoctorMaterials,
  BODY_MAP_REGIONS,
} from "./DoctorWardrobe";

const facialExpressions = {
  default: {},
  smile: {
    browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.17,
    noseSneerRight: 0.14,
    mouthPressLeft: 0.61,
    mouthPressRight: 0.41,
  },
  sad: {
    mouthFrownLeft: 1,
    mouthFrownRight: 1,
    mouthShrugLower: 0.78,
    browInnerUp: 0.45,
    eyeSquintLeft: 0.72,
    eyeSquintRight: 0.75,
    eyeLookDownLeft: 0.5,
    eyeLookDownRight: 0.5,
    jawForward: 1,
  },
  surprised: {
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    jawOpen: 0.35,
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
  },
};

const corresponding = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_aa",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_sil",
};

let setupMode = false;

export function Avatar(props) {
  const { nodes, materials, scene } = useGLTF("/models/64f1a714fe61576b46f27ca2.glb");

  const [badgeTexture, faceTexture] = useTexture([
    "/textures/doctor_badge.svg",
    "/models/doctor_face.png",
  ]);

  const { message, onMessagePlayed, chat } = useChat();

  const group = useRef();
  const audioRef = useRef(null);
  const lastPlayedMessageRef = useRef(null);

  // ── All hot refs so useFrame never has stale closures ─────────────────────
  const lipsyncRef = useRef(null);
  const facialExpressionRef = useRef("default");
  const pendingAudioRef = useRef(null);
  const hasMessageRef = useRef(false);

  const [lipsync, setLipsyncState] = useState(null);
  const [facialExpression, setFacialExpressionState] = useState("default");
  const [blink, setBlink] = useState(false);
  const [winkLeft, setWinkLeft] = useState(false);
  const [winkRight, setWinkRight] = useState(false);

  const setLipsync = (v) => {
    lipsyncRef.current = v;
    setLipsyncState(v);
  };
  const setFacialExpression = (v) => {
    facialExpressionRef.current = v;
    setFacialExpressionState(v);
  };

  const animationGltf = useGLTF("/models/animations.glb");

  // ── Animations ─────────────────────────────────────────────────────────────
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

  const [animation, setAnimation] = useState(() => {
    if (cleanedAnimations.find((a) => a.name === "Idle")) return "Idle";
    return cleanedAnimations[0]?.name || "";
  });

  // ── Generate 3D Skinned Doctor Wardrobe Geometries & Materials ─────────────
  const labCoatGeom = useMemo(() => createLabCoatGeometry(), []);
  const scrubTopGeom = useMemo(() => createScrubTopGeometry(), []);
  const scrubTrousersGeom = useMemo(() => createScrubTrousersGeometry(), []);
  const sneakersGeom = useMemo(() => createSneakersGeometry(), []);
  const stethoscopeGeom = useMemo(() => createStethoscopeGeometry(), []);
  const idBadgeGeom = useMemo(() => createIDBadgeGeometry(), []);
  const ponytailHairGeom = useMemo(() => createPonytailHairGeometry(), []);

  const doctorMaterials = useMemo(() => getDoctorMaterials(badgeTexture), [badgeTexture]);

  // ── Natural Indian Skin Tone & Subtle Physician Grooming ───────────────────
  useEffect(() => {
    if (materials?.Wolf3D_Skin) {
      if (faceTexture) {
        faceTexture.flipY = false;
        faceTexture.colorSpace = THREE.SRGBColorSpace;
        faceTexture.needsUpdate = true;
        materials.Wolf3D_Skin.map = faceTexture;
      }
      // Radiant, warm medium Indian golden complexion
      materials.Wolf3D_Skin.color = new THREE.Color("#E8B99D");
      materials.Wolf3D_Skin.roughness = 0.55;
      materials.Wolf3D_Skin.metalness = 0.0;
      materials.Wolf3D_Skin.needsUpdate = true;
    }

    if (materials?.Wolf3D_Body) {
      // Natural medium Indian skin tone for hands and neck
      materials.Wolf3D_Body.color = new THREE.Color("#BD8262");
      materials.Wolf3D_Body.roughness = 0.55;
      materials.Wolf3D_Body.metalness = 0.0;
      materials.Wolf3D_Body.needsUpdate = true;
    }

    if (materials?.Wolf3D_Eye) {
      // Natural dark brown iris with clean white sclera
      materials.Wolf3D_Eye.color = new THREE.Color("#FFFFFF");
      materials.Wolf3D_Eye.roughness = 0.10;
      materials.Wolf3D_Eye.metalness = 0.05;
      materials.Wolf3D_Eye.needsUpdate = true;
    }

    if (materials?.Wolf3D_Teeth) {
      materials.Wolf3D_Teeth.color = new THREE.Color("#FFFFFF");
      materials.Wolf3D_Teeth.roughness = 0.20;
      materials.Wolf3D_Teeth.needsUpdate = true;
    }
  }, [materials, faceTexture]);

  // ── Message handler: process audio, lipsync, animation ─────────────────────
  useEffect(() => {
    if (!message) {
      hasMessageRef.current = false;
      setAnimation("Idle");
      setLipsync(null);
      setFacialExpression("default");
      return;
    }

    if (lastPlayedMessageRef.current === message.id) {
      return;
    }
    lastPlayedMessageRef.current = message.id;
    hasMessageRef.current = true;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setFacialExpression(message.facialExpression || "default");
    const chosenAnim = message.animation || "Talking_1";
    setAnimation(animationNames.includes(chosenAnim) ? chosenAnim : "Talking_1");

    if (message.audio) {
      try {
        const audio = new Audio("data:audio/mp3;base64," + message.audio);
        audioRef.current = audio;
        pendingAudioRef.current = audio;

        if (message.lipsync) {
          setLipsync(message.lipsync);
        }

        audio.onended = () => {
          hasMessageRef.current = false;
          setLipsync(null);
          setFacialExpression("default");
          setAnimation("Idle");
          audioRef.current = null;
          pendingAudioRef.current = null;
          onMessagePlayed();
        };

        audio.onerror = () => {
          hasMessageRef.current = false;
          setLipsync(null);
          setAnimation("Idle");
          audioRef.current = null;
          pendingAudioRef.current = null;
          onMessagePlayed();
        };

        audio.play().catch(() => {
          pendingAudioRef.current = audio;
        });
      } catch (err) {
        hasMessageRef.current = false;
        setLipsync(null);
        setAnimation("Idle");
        onMessagePlayed();
      }
    } else {
      hasMessageRef.current = false;
      setLipsync(null);
      setAnimation("Idle");
      onMessagePlayed();
    }
  }, [message]);

  // ── Unblock browser autoplay on first user interaction ─────────────────────
  useEffect(() => {
    const unlock = () => {
      if (pendingAudioRef.current && pendingAudioRef.current.paused) {
        pendingAudioRef.current.play().catch(() => {});
        pendingAudioRef.current = null;
      }
    };
    window.addEventListener("click", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // ── Animation action transitions ───────────────────────────────────────────
  useEffect(() => {
    if (!actions || !animation) return;
    const currentAction = actions[animation];
    if (currentAction) {
      currentAction.reset().fadeIn(0.3).play();
    }
    return () => {
      if (currentAction) {
        currentAction.fadeOut(0.3);
      }
    };
  }, [animation, actions]);

  // ── Helper: Lerp morph targets ─────────────────────────────────────────────
  const lerpMorphTarget = (target, value, speed) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (index === undefined || child.morphTargetInfluences[index] === undefined) {
          return;
        }
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          child.morphTargetInfluences[index],
          value,
          speed
        );
      }
    });
  };

  // ── Frame loop: lipsync, facial expressions, eye blinks ────────────────────
  useFrame(() => {
    const exprKey = facialExpressionRef.current;
    const mapping = facialExpressions[exprKey] || {};

    if (!setupMode && nodes?.EyeLeft?.morphTargetDictionary) {
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") return;
        if (mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      });
    }

    // Rhubarb Lip-Sync Viseme interpolation
    const activeLipsync = lipsyncRef.current;
    const activeAudio = audioRef.current;

    let targetViseme = null;
    if (activeLipsync && activeAudio && !activeAudio.paused) {
      const currentAudioTime = activeAudio.currentTime;
      for (let i = 0; i < activeLipsync.mouthCues.length; i++) {
        const mouthCue = activeLipsync.mouthCues[i];
        if (currentAudioTime >= mouthCue.start && currentAudioTime <= mouthCue.end) {
          targetViseme = corresponding[mouthCue.value];
          break;
        }
      }
    }

    Object.values(corresponding).forEach((viseme) => {
      if (viseme === targetViseme) {
        lerpMorphTarget(viseme, 1.0, 0.25);
      } else {
        lerpMorphTarget(viseme, 0.0, 0.25);
      }
    });

    lerpMorphTarget("eyeBlinkLeft", blink || winkLeft ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5);
  });

  // ── Leva controls ──────────────────────────────────────────────────────────
  useControls("FacialExpressions", {
    chat: button(() => chat("Hello")),
    winkLeft: button(() => { setWinkLeft(true); setTimeout(() => setWinkLeft(false), 300); }),
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
  });

  // ── Blinking loop ──────────────────────────────────────────────────────────
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

  // ── Automated Verification Capture ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("avatarPreview")) {
      const params = new URLSearchParams(window.location.search);
      const filename = params.get("filename") || "rendered_avatar.png";
      const animParam = params.get("anim");
      if (animParam && actions[animParam]) {
        actions[animParam].reset().fadeIn(0.2).play();
      }

      const timer = setTimeout(() => {
        const canvas = document.querySelector("canvas");
        if (canvas) {
          try {
            const dataUrl = canvas.toDataURL("image/png");
            fetch(`/api/save-screenshot?filename=${encodeURIComponent(filename)}`, {
              method: "POST",
              headers: { "Content-Type": "text/plain" },
              body: dataUrl,
            }).then(() => console.log("Screenshot successfully saved to server:", filename))
              .catch(e => console.warn("Screenshot post failed", e));
          } catch (e) {
            console.warn("toDataURL error", e);
          }
        }
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [actions]);

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />

      {/* 🩺 Realistic 3D Physician Garments (Mixamo 67-Bone Rigged) */}
      <skinnedMesh
        name="Doctor_LabCoat"
        geometry={labCoatGeom}
        material={doctorMaterials.coat}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Doctor_ScrubTop"
        geometry={scrubTopGeom}
        material={doctorMaterials.scrubs}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Doctor_ScrubTrousers"
        geometry={scrubTrousersGeom}
        material={doctorMaterials.scrubs}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Doctor_Sneakers"
        geometry={sneakersGeom}
        material={doctorMaterials.sneakers}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Doctor_Stethoscope"
        geometry={stethoscopeGeom}
        material={doctorMaterials.stethoscope}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Doctor_ID_Badge"
        geometry={idBadgeGeom}
        material={doctorMaterials.idBadge}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />

      {/* 🩺 Sleek Professional Ponytail Hairstyle (conforming scalp cap + elastic tie + low ponytail) */}
      <skinnedMesh
        name="Doctor_Hair_Ponytail"
        geometry={ponytailHairGeom}
        material={doctorMaterials.hair}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />

      {/* 🩺 Anatomical Body: Hands */}
      <skinnedMesh
        name="Wolf3D_Body"
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />

      {/* 🩺 Facial Anatomy & Rhubarb Lip-Sync Blendshapes */}
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />

      {/* 🩺 Dedicated Anatomical Raycast Targets for Interactive Body Map */}
      <group name="BodyMap_RaycastTargets">
        {BODY_MAP_REGIONS.map((region) => (
          <mesh
            key={region.id}
            name={`AnatomyTarget_${region.id}`}
            position={region.position}
            visible={false}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent("sanjeevni:bodypart", {
                  detail: {
                    id: region.id,
                    label: region.label,
                    symptoms: region.symptoms,
                  },
                })
              );
            }}
          >
            {region.radius ? (
              <sphereGeometry args={[region.radius, 12, 12]} />
            ) : (
              <boxGeometry args={region.size} />
            )}
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

useGLTF.preload("/models/64f1a714fe61576b46f27ca2.glb");
useGLTF.preload("/models/animations.glb");
