import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] = useState("");
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length > 2) {
            return ".";
          }
          return loadingText + ".";
        });
      }, 800);
      return () => clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);
  if (!loading) return null;
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="black" />
      </Text>
    </group>
  );
};

export const Experience = () => {
  const cameraControls = useRef();
  const { cameraZoomed } = useChat();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      if (view === "face") {
        cameraControls.current?.setLookAt(0, 1.58, 0.65, 0, 1.57, 0);
        return;
      } else if (view === "uniform") {
        cameraControls.current?.setLookAt(0, 1.15, 1.40, 0, 1.12, 0);
        return;
      } else if (view === "steth") {
        cameraControls.current?.setLookAt(0.0, 1.33, 0.82, 0.0, 1.28, 0.12);
        return;
      } else if (view === "side" || view === "right") {
        cameraControls.current?.setLookAt(2.8, 0.96, 0, 0, 0.92, 0);
        return;
      } else if (view === "left") {
        cameraControls.current?.setLookAt(-2.8, 0.96, 0, 0, 0.92, 0);
        return;
      } else if (view === "back") {
        cameraControls.current?.setLookAt(0, 0.96, -3.85, 0, 0.92, 0);
        return;
      } else if (view === "threequarter") {
        cameraControls.current?.setLookAt(1.8, 1.05, 2.8, 0, 0.95, 0);
        return;
      } else if (view === "front") {
        cameraControls.current?.setLookAt(0, 0.96, 3.85, 0, 0.92, 0);
        return;
      }
    }
    if (cameraZoomed) {
      // Attentive close-up for conversational consultation
      cameraControls.current?.setLookAt(0, 1.42, 1.65, 0, 1.38, 0, true);
    } else {
      // Prominent full-body clinical presence (head to toe fully visible above UI bar)
      cameraControls.current?.setLookAt(0, 0.96, 3.85, 0, 0.92, 0, true);
    }
  }, [cameraZoomed]);

  return (
    <>
      <CameraControls ref={cameraControls} />

      {/* 🔹 Professional Medical Studio Lighting (Balanced Key, Soft Fill, Subtle Rim) */}
      <ambientLight intensity={0.65} color="#FFFFFF" />
      <directionalLight position={[2.0, 4.0, 3.5]} intensity={0.80} castShadow color="#FFFDF7" />
      <directionalLight position={[-2.5, 2.5, 2.0]} intensity={0.35} color="#F0FDF4" />
      <directionalLight position={[0, 3.0, -2.5]} intensity={0.30} color="#CCFBF1" />
      <pointLight position={[0, 1.3, 1.2]} intensity={0.20} color="#FFFFFF" />

      {/* Wrapping Environment into Suspense so CDN delays/blocks never hang the 3D scene */}
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>

      {/* Wrapping Dots into Suspense to prevent Blink when Troika/Font is loaded */}
      <Suspense fallback={null}>
        <Dots position-y={1.82} position-x={-0.02} />
      </Suspense>

      <Suspense fallback={null}>
        <Avatar position-y={0.08} />
      </Suspense>

      <ContactShadows opacity={0.5} scale={10} blur={2.5} far={4} color="#0D9488" />
    </>
  );
};
