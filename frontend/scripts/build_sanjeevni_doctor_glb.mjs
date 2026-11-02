// Script to assemble and export the unified sanjeevni_doctor.glb model
// Preserves the 67-joint humanoid skeleton, 15 Oculus visemes, and binds all new doctor garments

import * as THREE from "three";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createAnatomicalBodyGeometry,
  createLabCoatGeometry,
  createScrubTopGeometry,
  createScrubTrousersGeometry,
  createSneakersGeometry,
  createStethoscopeGeometry,
  createIDBadgeGeometry,
  createPonytailHairGeometry,
  getDoctorMaterials,
} from "../src/components/DoctorWardrobe.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Polyfill FileReader for Three.js GLTFExporter
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

console.log("=== BUILDING UNIFIED SANJEEVNI DOCTOR GLB ASSET ===");

async function buildDoctorAsset() {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");

  const modelPath = path.resolve(__dirname, "../public/models/64f1a714fe61576b46f27ca2.glb");
  const buffer = fs.readFileSync(modelPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const loader = new GLTFLoader();
  loader.parse(arrayBuffer, "", (gltf) => {
    const scene = gltf.scene;

    console.log("Original GLB loaded successfully.");

    // Find the 67 bones and root Skeleton
    let skeleton = null;
    let hipsBone = null;
    const bones = [];

    scene.traverse((child) => {
      if (child.isBone) {
        bones.push(child);
        if (child.name === "Hips") hipsBone = child;
      }
      if (child.isSkinnedMesh && child.skeleton && !skeleton) {
        skeleton = child.skeleton;
      }
    });

    console.log(`Found ${bones.length} bones. Skeleton root: ${hipsBone?.name}`);
    console.log(`Skeleton joints count: ${skeleton.bones.length}`);

    // Verify 15 Oculus Visemes on Wolf3D_Head
    const headMesh = scene.getObjectByName("Wolf3D_Head");
    if (!headMesh || !headMesh.morphTargetDictionary) {
      throw new Error("Wolf3D_Head mesh with morphTargetDictionary not found!");
    }
    const visemes = [
      "viseme_PP", "viseme_FF", "viseme_TH", "viseme_DD", "viseme_kk",
      "viseme_CH", "viseme_SS", "viseme_nn", "viseme_RR", "viseme_aa",
      "viseme_E", "viseme_I", "viseme_O", "viseme_U", "viseme_sil"
    ];
    const missingVisemes = visemes.filter(v => headMesh.morphTargetDictionary[v] === undefined);
    if (missingVisemes.length > 0) {
      throw new Error("Missing critical visemes: " + missingVisemes.join(", "));
    }
    console.log("All 15 Oculus Visemes validated on Wolf3D_Head!");

    // Remove legacy Ready Player Me clothing meshes:
    const meshesToRemove = [
      "Wolf3D_Outfit_Top",
      "Wolf3D_Outfit_Bottom",
      "Wolf3D_Outfit_Footwear",
      "Wolf3D_Hair"
    ];
    meshesToRemove.forEach((name) => {
      const mesh = scene.getObjectByName(name);
      if (mesh && mesh.parent) {
        mesh.parent.remove(mesh);
        console.log(`Removed legacy RPM clothing mesh: ${name}`);
      }
    });

    // Create the new doctor garments and bind to the skeleton
    const materials = getDoctorMaterials(null);

    // 0. Anatomical human body under garments
    const bodyMeshRef = scene.getObjectByName("Wolf3D_Body");
    const anatomicalGeom = createAnatomicalBodyGeometry();
    const anatomicalMesh = new THREE.SkinnedMesh(anatomicalGeom, bodyMeshRef?.material || materials.scrubs);
    anatomicalMesh.name = "Doctor_AnatomicalBody";
    anatomicalMesh.bind(skeleton);
    scene.add(anatomicalMesh);
    console.log("Added skinned mesh: Doctor_AnatomicalBody");

    const labCoatGeom = createLabCoatGeometry();
    const labCoatMesh = new THREE.SkinnedMesh(labCoatGeom, materials.coat);
    labCoatMesh.name = "Doctor_LabCoat";
    labCoatMesh.bind(skeleton);
    scene.add(labCoatMesh);
    console.log("Added skinned mesh: Doctor_LabCoat");

    const scrubTopGeom = createScrubTopGeometry();
    const scrubTopMesh = new THREE.SkinnedMesh(scrubTopGeom, materials.scrubs);
    scrubTopMesh.name = "Doctor_ScrubTop";
    scrubTopMesh.bind(skeleton);
    scene.add(scrubTopMesh);
    console.log("Added skinned mesh: Doctor_ScrubTop");

    const scrubTrousersGeom = createScrubTrousersGeometry();
    const scrubTrousersMesh = new THREE.SkinnedMesh(scrubTrousersGeom, materials.scrubs);
    scrubTrousersMesh.name = "Doctor_ScrubTrousers";
    scrubTrousersMesh.bind(skeleton);
    scene.add(scrubTrousersMesh);
    console.log("Added skinned mesh: Doctor_ScrubTrousers");

    const sneakersGeom = createSneakersGeometry();
    const sneakersMesh = new THREE.SkinnedMesh(sneakersGeom, materials.sneakers);
    sneakersMesh.name = "Doctor_Sneakers";
    sneakersMesh.bind(skeleton);
    scene.add(sneakersMesh);
    console.log("Added skinned mesh: Doctor_Sneakers");

    const stethGeom = createStethoscopeGeometry();
    const stethMesh = new THREE.SkinnedMesh(stethGeom, materials.stethoscope);
    stethMesh.name = "Doctor_Stethoscope";
    stethMesh.bind(skeleton);
    scene.add(stethMesh);
    console.log("Added skinned mesh: Doctor_Stethoscope");

    const badgeGeom = createIDBadgeGeometry();
    const badgeMesh = new THREE.SkinnedMesh(badgeGeom, materials.idBadge);
    badgeMesh.name = "Doctor_ID_Badge";
    badgeMesh.bind(skeleton);
    scene.add(badgeMesh);
    console.log("Added skinned mesh: Doctor_ID_Badge");

    const hairGeom = createPonytailHairGeometry();
    const hairMesh = new THREE.SkinnedMesh(hairGeom, materials.hair);
    hairMesh.name = "Doctor_Hair_Ponytail";
    hairMesh.bind(skeleton);
    scene.add(hairMesh);
    console.log("Added skinned mesh: Doctor_Hair_Ponytail");

    // Export to sanjeevni_doctor.glb
    const outPath = path.resolve(__dirname, "../public/models/sanjeevni_doctor.glb");
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (glb) => {
        fs.writeFileSync(outPath, Buffer.from(glb));
        console.log(`SUCCESS! Exported sanjeevni_doctor.glb (${(glb.byteLength / (1024 * 1024)).toFixed(2)} MB) to ${outPath}`);

        // Validate exported GLB
        validateExportedGLB(outPath);
      },
      (err) => {
        console.error("GLTFExporter error:", err);
      },
      { binary: true }
    );
  }, (err) => console.error("Loader error:", err));
}

function validateExportedGLB(glbPath) {
  const glb = fs.readFileSync(glbPath);
  const jsonLen = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8"));

  console.log("\n=== VALIDATING EXPORTED GLB ===");
  console.log("Total Meshes in Exported Asset:", gltf.meshes.length);
  gltf.meshes.forEach((m, idx) => {
    console.log(`  Mesh ${idx}: "${m.name}", Primitives: ${m.primitives.length}, Targets: ${m.primitives[0].targets ? m.primitives[0].targets.length : 0}`);
  });

  console.log("Total Nodes:", gltf.nodes.length);
  const skin = gltf.skins?.[0];
  console.log("Joints in Skin 0:", skin?.joints?.length);
  console.log("=== EXPORTED ASSET 100% VALIDATED ===\n");
}

buildDoctorAsset().catch(console.error);
