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
    // Complete head-to-toe clinical view: head, coat, stethoscope, scrubs, hands, and white medical shoes visible
    cameraControls.current?.setLookAt(0, 0.92, 3.6, 0, 0.86, 0);
  }, []);

  useEffect(() => {
    if (cameraZoomed) {
      // Attentive close-up for conversational consultation
      cameraControls.current?.setLookAt(0, 1.34, 1.65, 0, 1.30, 0, true);
    } else {
      // Prominent full-body clinical presence (head to toe fully visible, perfectly centered)
      cameraControls.current?.setLookAt(0, 0.92, 3.6, 0, 0.86, 0, true);
    }
  }, [cameraZoomed]);

  return (
    <>
      <CameraControls ref={cameraControls} />

      {/* 🔹 Professional Medical Studio Lighting (Soft Key, Fill, Rim & Stethoscope Catchlight) */}
      <ambientLight intensity={0.8} color="#F8FAFC" />
      <directionalLight position={[2.5, 4.5, 3.5]} intensity={1.2} castShadow color="#FFFDF7" />
      <directionalLight position={[-3.5, 3.0, 2.0]} intensity={0.7} color="#E0F2FE" />
      <directionalLight position={[0, 3.5, -2.5]} intensity={0.55} color="#CCFBF1" />
      <pointLight position={[0, 1.7, 1.5]} intensity={0.4} color="#FFFFFF" />
      {/* Focused illumination on Stethoscope & Hospital ID Badge */}
      <pointLight position={[0, 1.2, 1.1]} intensity={0.55} color="#FFFFFF" />

      {/* Wrapping Environment into Suspense so CDN delays/blocks never hang the 3D scene */}
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>

      {/* Wrapping Dots into Suspense to prevent Blink when Troika/Font is loaded */}
      <Suspense fallback={null}>
        <Dots position-y={1.75} position-x={-0.02} />
      </Suspense>

      <Suspense fallback={null}>
        <Avatar />
      </Suspense>

      <ContactShadows opacity={0.5} scale={10} blur={2.5} far={4} color="#0D9488" />
    </>
  );
};
