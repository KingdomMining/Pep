import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  Sparkles,
} from '@react-three/drei';
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
// the ambient category field, the glass vial, floating sparkles + a soft
// contact shadow on big scenes, and a bloom/DoF post stack.
//
// Extra life on the big scenes:
//   • ParallaxRig  — the camera leans gently toward the mouse (hero).
//   • AdaptiveOrbit — detail-view auto-rotate speeds up while the label faces
//     away from the camera, so the sticker spends less time hidden.
// ---------------------------------------------------------------------------

const BLOOM = { idle: 0.7, hover: 1.6, ease: 4 };

function HoverBloom({ hovered }) {
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

/**
 * Camera parallax for the hero: eases the camera a small distance toward the
 * pointer (tracked on window, since overlay copy sits above the canvas) and
 * keeps it aimed at the vial. Gives the scene a subtle "alive" depth.
 */
function ParallaxRig({ enabled }) {
  const pointer = useRef({ x: 0, y: 0 });
  const base = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled]);

  useFrame((state, delta) => {
    if (!enabled) return;
    const cam = state.camera;
    if (!base.current) base.current = cam.position.clone();
    const dt = Math.min(delta, 0.05);
    const tx = base.current.x + pointer.current.x * 0.5;
    const ty = base.current.y + pointer.current.y * 0.32;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tx, 3, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 3, dt);
    cam.lookAt(0, 0, 0);
  });

  return null;
}

/**
 * OrbitControls-lite for the detail view whose auto-rotate is label-aware:
 * the label faces +Z, so while the camera's azimuth carries it behind the
 * vial we speed the rotation up — the sticker spends less time hidden.
 */
function AdaptiveOrbit({ reducedMotion }) {
  const ref = useRef();

  useFrame(() => {
    const c = ref.current;
    if (!c || !c.autoRotate) return;
    const hidden = (1 - Math.cos(c.getAzimuthalAngle())) / 2;
    c.autoRotateSpeed = 0.9 * (1 + 2.6 * Math.pow(hidden, 1.6));
  });

  return (
    <OrbitControls
      ref={ref}
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
  // Extra downward nudge for the vial (hero pushes it down a touch so the bob
  // stays inside the frame).
  vialOffsetY = 0,
  // Postprocessing (bloom/DoF) is expensive per-canvas. Reserve it for the
  // large hero/detail scenes; gallery cards get the glow from emissive liquid
  // + a CSS radial halo instead, so many card canvases stay smooth together.
  bloom = big,
  className,
}) {
  // Static camera slightly angled. Cards sit a bit further back (zoomed out)
  // so the vial + label frame comfortably without clipping the cap.
  const camera = useMemo(
    () => ({ position: [0, 0.1, big ? 4.2 : 4.6], fov: 34 }),
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

        {/* Fine floating motes around the vial on big scenes — depth + life */}
        {big && (
          <Sparkles
            count={Math.max(24, Math.round(70 * quality.particleScale))}
            scale={[7, 4.5, 3]}
            position={[0, 0, -0.6]}
            size={2.2}
            speed={reducedMotion ? 0 : 0.25}
            opacity={0.5}
            color={product?.liquidColor || '#9be8ff'}
          />
        )}

        <Vial
          liquidColor={product?.liquidColor}
          hovered={hovered}
          reducedMotion={reducedMotion}
          interactive={interactive}
          offsetY={vialOffsetY}
          label={product?.name}
        />

        {/* Soft grounding shadow beneath the vial on big scenes */}
        {big && (
          <ContactShadows
            position={[0, -1.5 + vialOffsetY, 0]}
            opacity={0.55}
            scale={7}
            blur={2.4}
            far={2.2}
            color="#000000"
            frames={reducedMotion ? 1 : Infinity}
          />
        )}

        {/* --- Post: bloom (hover-reactive) + DoF on big scenes + vignette --- */}
        {bloom && (
          <EffectComposer disableNormalPass multisampling={big ? 4 : 0}>
            <HoverBloom hovered={hovered} />
            {big ? (
              <DepthOfField
                focusDistance={0.01}
                focalLength={0.06}
                bokehScale={2.2}
              />
            ) : (
              <></>
            )}
            <Vignette eskil={false} offset={0.25} darkness={0.85} />
          </EffectComposer>
        )}
      </Suspense>

      {/* Hero-style scenes lean gently toward the mouse */}
      <ParallaxRig enabled={big && !interactive && !reducedMotion} />

      {/* --- Label-aware OrbitControls-lite on detail views ---------------- */}
      {interactive && <AdaptiveOrbit reducedMotion={reducedMotion} />}
    </Canvas>
  );
}
