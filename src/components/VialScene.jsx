import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import Vial from './Vial.jsx';
import AmbientField from './AmbientField.jsx';

// ---------------------------------------------------------------------------
// <VialScene /> — a reusable R3F canvas that stages a single product: soft
// key + rim lighting, a procedural studio environment (built in-memory from
// Lightformers so glass reflects convincingly with NO network HDRI fetch),
// the ambient category field, the glass vial, and a bloom/DoF post stack.
//
// Bloom intensity eases up while `hovered` is true (per the brief: "on hover…
// bloom intensifies"). This is done inside useFrame so it animates smoothly.
// ---------------------------------------------------------------------------

const BLOOM = { idle: 0.7, hover: 1.5, ease: 4 };

function HoverBloom({ hovered, reducedMotion }) {
  const ref = useRef();
  const hoveredRef = useRef(hovered);
  hoveredRef.current = hovered;

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = hoveredRef.current ? BLOOM.hover : BLOOM.idle;
    ref.current.intensity = THREE.MathUtils.damp(
      ref.current.intensity,
      target,
      BLOOM.ease,
      Math.min(delta, 0.05)
    );
  });

  return (
    <Bloom
      ref={ref}
      intensity={BLOOM.idle}
      luminanceThreshold={0.15}
      luminanceSmoothing={0.9}
      mipmapBlur
      radius={0.7}
    />
  );
}

/** Procedural studio environment — a few glowing planes the glass reflects. */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Big soft key panel */}
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#ffffff"
        position={[3, 3, 2]}
        scale={[6, 6, 1]}
        target={[0, 0, 0]}
      />
      {/* Cool rim from behind-left */}
      <Lightformer
        form="rect"
        intensity={1.4}
        color="#5fb8ff"
        position={[-4, 1, -3]}
        scale={[5, 5, 1]}
        target={[0, 0, 0]}
      />
      {/* Warm fill from below */}
      <Lightformer
        form="circle"
        intensity={0.8}
        color="#ffd9a8"
        position={[0, -3, 1]}
        scale={[4, 4, 1]}
        target={[0, 0, 0]}
      />
      {/* Dark surround so reflections have contrast */}
      <Lightformer
        form="rect"
        intensity={0.15}
        color="#0a0c12"
        position={[0, 0, -6]}
        scale={[12, 12, 1]}
      />
    </Environment>
  );
}

export default function VialScene({
  product,
  hovered = false,
  interactive = false,
  reducedMotion = false,
  quality = { particleScale: 1, dpr: [1, 2] },
  paused = false,
  big = false,
  // Postprocessing (bloom/DoF) is expensive per-canvas. Reserve it for the
  // large hero/detail scenes; gallery cards get the glow from emissive liquid
  // + a CSS radial halo instead, so many card canvases stay smooth together.
  bloom = big,
  className,
}) {
  // Static camera slightly angled; a touch further back on big scenes.
  const camera = useMemo(
    () => ({ position: [0, 0.1, big ? 4.2 : 4.0], fov: 34 }),
    [big]
  );

  // Reduced motion or off-screen → render on demand only (saves the GPU /
  // battery and pauses off-screen canvases, per the perf brief).
  const frameloop = reducedMotion || paused ? 'demand' : 'always';

  return (
    <Canvas
      className={className}
      // Fill 100% of the (sized) wrapper the caller provides. Being explicit
      // here avoids clashing with R3F's own inline sizing, which previously
      // left fixed-height card canvases stuck at the 300×150 default.
      style={{ width: '100%', height: '100%', display: 'block' }}
      dpr={quality.dpr}
      frameloop={frameloop}
      camera={camera}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      // Keep colors filmic + let alpha through so CSS gradient shows behind.
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.1;
      }}
    >
      {/* --- Lighting: soft key + rim --------------------------------------- */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[3, 4, 3]}
        intensity={1.6}
        color="#ffffff"
      />
      {/* Rim light picks out the glass edge */}
      <directionalLight
        position={[-3, 1, -4]}
        intensity={1.1}
        color={product?.liquidColor || '#66ccff'}
      />

      <Suspense fallback={null}>
        <StudioEnvironment />

        {/* Ambient category field sits behind the vial */}
        <AmbientField
          category={product?.category}
          liquidColor={product?.liquidColor}
          particleScale={quality.particleScale}
          reducedMotion={reducedMotion}
          hovered={hovered}
        />

        <Vial
          liquidColor={product?.liquidColor}
          hovered={hovered}
          reducedMotion={reducedMotion}
          interactive={interactive}
        />

        {/* --- Post: bloom (hover-reactive) + DoF on big scenes + vignette --- */}
        {bloom && (
          <EffectComposer disableNormalPass multisampling={big ? 4 : 0}>
            <HoverBloom hovered={hovered} reducedMotion={reducedMotion} />
            {big ? (
              <DepthOfField
                focusDistance={0.01}
                focalLength={0.06}
                bokehScale={3}
              />
            ) : (
              <></>
            )}
            <Vignette eskil={false} offset={0.25} darkness={0.85} />
          </EffectComposer>
        )}
      </Suspense>

      {/* --- OrbitControls-lite on detail views: spin only, limited zoom --- */}
      {interactive && (
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={2.6}
          maxDistance={5.5}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.9}
          rotateSpeed={0.6}
          enableDamping
          dampingFactor={0.08}
        />
      )}
    </Canvas>
  );
}
