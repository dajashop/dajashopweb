import { useStorefront } from '../localization/StorefrontContext.jsx';
// src/components/Watch3DViewer.jsx
import React, { Suspense, useRef, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import { motion } from "framer-motion";
import * as THREE from "three";

// Definisanje nivoa kvaliteta i multiplikatora za pixelRatio
const QUALITY_LEVELS = {
  SD: { label: "Standard (SD)", multiplier: 0.5 },
  HD: { label: "Visok (HD)", multiplier: 1.0 },
};

/**
 * 3D Model Loader.
 * Učitava model i primenjuje podešavanja materijala za visok kvalitet.
 */
function Model({ modelPath, quality, ...props }) {
  // useGLTF automatski učitava teksture i materijale iz GLTF fajla (PBR)
  const { scene } = useGLTF(modelPath);

  useMemo(() => {
    // Prolazak kroz sve objekte za podešavanje materijala i senki
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          // Podešavanje PBR materijala za realističniji izgled sata
          child.material.metalness = child.material.metalness || 0.2; // Refleksija metala
          child.material.roughness = child.material.roughness || 0.2; // Glatkoća

          // HD/SD kontrola: utiče na glatkoću i oštrinu (konceptualno)
          if (child.material.map) {
            // Za HD koristimo bolji filter
            child.material.map.minFilter =
              quality === "HD"
                ? THREE.LinearMipMapLinearFilter
                : THREE.LinearFilter;
          }
        }
      }
    });
  }, [scene, quality]);

  // Automatsko centriranje modela
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.sub(center);

  // Dodatna vizuelna razlika: blago smanjenje u SD modu
  const scale = quality === "HD" ? 1 : 0.9;
  return <primitive object={scene} scale={[scale, scale, scale]} {...props} />;
}

// Komponenta za odabir kvaliteta
function QualitySelector({ quality, setQuality }) {
  const { t: translateText } = useStorefront();

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        right: 10,
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 8,
          borderRadius: 12,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {Object.keys(QUALITY_LEVELS).map((key) => (
          <button
            key={key}
            onClick={() => setQuality(key)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: "12px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              color:
                key === quality
                  ? "var(--color-onPrimary)"
                  : "var(--color-text)",
              background:
                key === quality ? "var(--color-primary)" : "var(--color-bg)",
              transition: "background 0.2s",
            }}
          >
            {translateText(QUALITY_LEVELS[key].label)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Watch3DViewer({ modelUrl }) {
  const { t: translateText } = useStorefront();

  const [quality, setQuality] = useState("HD"); // Podrazumevani HD
  const { multiplier } = QUALITY_LEVELS[quality];

  const canvasStyle = {
    background: "var(--color-surface)",
    borderRadius: "12px",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        width: "100%",
        height: "520px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Selector kvaliteta izvan Canvasa */}
      <QualitySelector quality={quality} setQuality={setQuality} />

      <Canvas
        shadows
        // KLJUČNO: Kontrola rezolucije (HD = 1.0x, SD = 0.5x)
        gl={{
          antialias: true,
          pixelRatio: window.devicePixelRatio * multiplier,
        }}
        camera={{ position: [-15, 10, 10], fov: 80 }}
        style={canvasStyle}
      >
        {/* Osvetljenje: Dodato jače svetlo za bolju refleksiju u HD */}
        <ambientLight intensity={10.2} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          castShadow={quality === "HD"} // Senke su zahtevne, isključujemo ih u SD
          intensity={quality === "HD" ? 1.0 : 0.4}
        />
        <pointLight position={[-10, 10, 15]} intensity={100} />

        {/* Kontrole rotacije i zumiranja */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={0.8}
        />

        {/* 3D Model sa Fallback-om */}
        <Suspense
          fallback={
            <Html center>
              <div
                style={{
                  color: "var(--color-text)",
                  fontSize: "14px",
                  padding: "10px",
                  background: "var(--color-bg)",
                  borderRadius: "8px",
                  opacity: 0.7,
                }}
              >{translateText("Učitavanje 3D modela... ⏳")}</div>
            </Html>
          }
        >
          <Model modelPath={modelUrl} quality={quality} />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}
