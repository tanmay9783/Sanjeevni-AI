import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Suspense } from "react";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <Loader
        containerStyles={{ background: "rgba(15, 23, 42, 0.92)", backdropFilter: "blur(8px)" }}
        innerStyles={{ width: "280px", height: "6px", borderRadius: "999px", background: "rgba(255,255,255,0.15)" }}
        barStyles={{ height: "6px", borderRadius: "999px", background: "linear-gradient(90deg, #0EA5E9, #6366F1)" }}
        dataStyles={{ color: "#E2E8F0", fontFamily: "system-ui, sans-serif", fontSize: "13px", fontWeight: "600" }}
        dataInterpolation={(p) => `Starting 3D Doctor Kiosk... ${p.toFixed(0)}%`}
      />
      <Leva hidden />
      <UI />
      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 30 }}
        style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
    </ErrorBoundary>
  );
}

export default App;
