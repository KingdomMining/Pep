import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Lightformer,
  Sparkles,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
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

// We never use R3F's built-in DOM pointer events (gallery hover is driven from
// HTML; the detail drag uses its own listeners in OrbitRig). Its event manager
// occasionally raced to connect() against a null target in the production
// build and threw. This no-op manager skips that DOM wiring entirely.
const NO_EVENTS = () => ({
  enabled: false,
  priority: 0,
  connected: false,
  handlers: {},
  connect: () => {},
  disconnect: () => {},
  compute: () => {},
});

// A high luminance threshold means only genuine specular highlights bloom, so
// the light sticker panel + text never wash out — this keeps the label crisp
// even when the overall intensity is turned up. The detail view (interactive)
// stays gentle so its large centered label is pristine; the hero pushes the
// glow for drama.
function HoverBloom({ hovered, idle, hover }) {
  const ref = useRef();
  const state = useRef({ hovered, idle, hover });
  state.current = { hovered, idle, hover };

  useFrame((_, delta) => {
    if (!ref.current) return;
    const { hovered: h, idle: i, hover: hv } = state.current;
    ref.current.intensity = THREE.MathUtils.damp(
      ref.current.intensity,
      h ? hv : i,
      4,
      Math.min(delta, 0.05)
    );
  });

  return (
    <Bloom
      ref={ref}
      intensity={idle}
      luminanceThreshold={0.62}
      luminanceSmoothing={0.85}
      mipmapBlur
      radius={0.6}
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
 * OrbitRig — a small, dependency-free orbit control for the detail view.
 * Drag to spin the vial (with release inertia), wheel to zoom (clamped, no
 * pan). When idle it slowly auto-rotates, speeding up while the label faces
 * away so the sticker spends less time hidden. Replacing drei's OrbitControls
 * avoids a flaky connect() bug in this drei/three-stdlib combo and gives the
 * liquid slosh a nice inertial spin to settle against.
 */
function OrbitRig({ reducedMotion }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  const st = useRef({
    theta: 0, // azimuth (label faces the camera at 0)
    phi: Math.PI / 2 - 0.02, // polar from +Y (near level)
    r: camera.position.length() || 4.2,
    targetR: camera.position.length() || 4.2,
    vTheta: 0,
    prevTheta: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  const MIN_R = 2.6;
  const MAX_R = 5.5;
  const MIN_PHI = Math.PI * 0.2;
  const MAX_PHI = Math.PI * 0.8;

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    el.style.cursor = 'grab';

    const down = (e) => {
      st.current.dragging = true;
      st.current.lastX = e.clientX;
      st.current.lastY = e.clientY;
      el.style.cursor = 'grabbing';
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      const s = st.current;
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.theta -= dx * 0.01;
      s.phi = Math.min(MAX_PHI, Math.max(MIN_PHI, s.phi - dy * 0.01));
    };
    const up = (e) => {
      st.current.dragging = false;
      el.style.cursor = 'grab';
      el.releasePointerCapture?.(e.pointerId);
    };
    const wheel = (e) => {
      e.preventDefault();
      const s = st.current;
      s.targetR = Math.min(MAX_R, Math.max(MIN_R, s.targetR + e.deltaY * 0.002));
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.style.cursor = '';
    };
  }, [gl]);

  useFrame((_, delta) => {
    const s = st.current;
    const dt = Math.min(delta, 0.05);

    if (s.dragging) {
      // Measure the drag's angular velocity for release inertia.
      s.vTheta = dt > 0 ? (s.theta - s.prevTheta) / dt : 0;
    } else {
      // Idle auto-rotate target, faster while the label (θ=0) faces away.
      const hidden = (1 - Math.cos(s.theta)) / 2;
      const autoV = reducedMotion ? 0 : 0.5 * (1 + 2.2 * Math.pow(hidden, 1.6));
      s.vTheta = THREE.MathUtils.damp(s.vTheta, autoV, 1.2, dt); // inertia → auto
      s.theta += s.vTheta * dt;
      // Gently self-level the tilt when not being dragged.
      s.phi = THREE.MathUtils.damp(s.phi, Math.PI / 2 - 0.02, 1.4, dt);
    }
    s.prevTheta = s.theta;

    s.r = THREE.MathUtils.damp(s.r, s.targetR, 8, dt);
    const sinPhi = Math.sin(s.phi);
    camera.position.set(
      s.r * sinPhi * Math.sin(s.theta),
      s.r * Math.cos(s.phi),
      s.r * sinPhi * Math.cos(s.theta)
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
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

  // When mounted lazily (gallery cards mount once scrolled near), R3F's
  // measure hook can miss the already-laid-out container and leave the canvas
  // at its 300×150 default. A one-shot synthetic resize forces a correct
  // re-measure against the real container size.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      window.dispatchEvent(new Event('resize'))
    );
    return () => cancelAnimationFrame(id);
  }, []);

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
      events={NO_EVENTS}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      // Keep colors filmic + let alpha through so CSS gradient shows behind.
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.0;
      }}
    >
      {/* --- Lighting: soft key + rim --------------------------------------- */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[3, 4, 3]}
        intensity={1.35}
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

        {/* --- Post: bloom + vignette. No depth-of-field: it was blurring the
             product + label. The detail (interactive) keeps bloom gentle so
             its label is pristine; the hero pushes it for drama. --- */}
        {bloom && (
          <EffectComposer disableNormalPass multisampling={big ? 4 : 0}>
            <HoverBloom
              hovered={hovered}
              idle={interactive ? 0.5 : 0.95}
              hover={interactive ? 0.85 : 1.25}
            />
            <Vignette eskil={false} offset={0.28} darkness={0.8} />
          </EffectComposer>
        )}
      </Suspense>

      {/* Hero-style scenes lean gently toward the mouse */}
      <ParallaxRig enabled={big && !interactive && !reducedMotion} />

      {/* --- Custom drag-to-spin + zoom on detail views ------------------- */}
      {interactive && <OrbitRig reducedMotion={reducedMotion} />}
    </Canvas>
  );
}
