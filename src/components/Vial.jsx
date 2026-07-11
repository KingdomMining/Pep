import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// <Vial /> — a translucent glass laboratory vial.
//
// Construction:
//   • Glass body   : a LatheGeometry (surface of revolution) giving smooth,
//                    rounded shoulders + neck, wrapped in MeshPhysicalMaterial
//                    with transmission so it reads as real glass.
//   • Liquid fill  : an inner cylinder with its own color + emissive glow, sat
//                    at the bottom of the body and visible through the glass.
//   • Cap          : an aluminum crimp ring + a rounded rubber stopper.
//
// Animation (all tweakable constants live in ANIM below):
//   • Idle  : continuous slow Y-axis spin + gentle sine-wave vertical bob, so
//             the vial feels suspended in fluid.
//   • Hover : eases to a faster spin and scales up slightly.
//   • Reduced motion: spin/bob/scale are all frozen to a static pose.
// ---------------------------------------------------------------------------

const ANIM = {
  idleSpin: 0.3, // rad/s — base idle Y rotation (per brief: ~0.3)
  hoverSpin: 0.9, // rad/s — eased-to spin while hovered
  spinEase: 2.5, // how quickly current spin approaches the target
  bobAmplitude: 0.06, // world units of vertical travel
  bobFrequency: 1.1, // radians/sec of the bob sine wave
  hoverScale: 1.08, // scale multiplier while hovered
  scaleEase: 8, // how quickly scale approaches its target
  staticTilt: 0.5, // fixed Y angle used in reduced-motion mode
};

/**
 * Build the vial's silhouette as a 2D profile (x = radius, y = height) and
 * revolve it with LatheGeometry. Tweak these points to reshape the vial.
 */
function useVialGeometry() {
  return useMemo(() => {
    const profile = [
      [0.0, -0.9], // bottom center (closes the base)
      [0.46, -0.9], // bottom edge
      [0.52, -0.84], // rounded bottom corner
      [0.52, 0.5], // straight body wall
      [0.5, 0.62], // shoulder begins
      [0.36, 0.76], // shoulder curve in
      [0.28, 0.86], // neck
      [0.28, 1.0], // neck top
      [0.31, 1.03], // flared lip
    ].map(([x, y]) => new THREE.Vector2(x, y));

    // 64 radial segments keeps the revolve smooth without being heavy.
    const geo = new THREE.LatheGeometry(profile, 64);
    geo.computeVertexNormals();
    return geo;
  }, []);
}

export default function Vial({
  liquidColor = '#3fd6c9',
  hovered = false,
  reducedMotion = false,
  interactive = false, // detail view: OrbitControls owns the spin, so skip self-spin
  ...groupProps
}) {
  const group = useRef();
  const currentSpin = useRef(ANIM.idleSpin);
  const bodyGeo = useVialGeometry();

  // Liquid material: emissive so it glows through the transmissive glass and
  // catches the bloom pass. Kept subtly translucent for a fluid look.
  const liquidMat = useMemo(() => {
    const c = new THREE.Color(liquidColor);
    return new THREE.MeshPhysicalMaterial({
      color: c,
      emissive: c,
      // A little brighter so the liquid still reads as "glowing" on gallery
      // cards, which run without the bloom pass.
      emissiveIntensity: 0.7,
      roughness: 0.25,
      metalness: 0,
      transmission: 0.35,
      thickness: 0.6,
      ior: 1.33, // ~water
      transparent: true,
      opacity: 0.92,
    });
  }, [liquidColor]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    // Clamp delta so a dropped frame / tab refocus can't cause a jump.
    const dt = Math.min(delta, 0.05);

    if (reducedMotion) {
      g.rotation.y = ANIM.staticTilt;
      g.position.y = 0;
      g.scale.setScalar(1);
      return;
    }

    // --- Spin: ease current speed toward idle or hover target -------------
    if (!interactive) {
      const targetSpin = hovered ? ANIM.hoverSpin : ANIM.idleSpin;
      currentSpin.current +=
        (targetSpin - currentSpin.current) * Math.min(1, ANIM.spinEase * dt);
      g.rotation.y += currentSpin.current * dt;
    }

    // --- Bob: gentle suspended-in-fluid sine wave -------------------------
    const t = state.clock.elapsedTime;
    g.position.y = Math.sin(t * ANIM.bobFrequency) * ANIM.bobAmplitude;

    // --- Scale: ease up slightly on hover ---------------------------------
    const targetScale = hovered ? ANIM.hoverScale : 1;
    const s = THREE.MathUtils.damp(g.scale.x, targetScale, ANIM.scaleEase, dt);
    g.scale.setScalar(s);
  });

  return (
    <group ref={group} {...groupProps}>
      {/* --- Glass body ---------------------------------------------------
          MeshPhysicalMaterial transmission is what sells the glass: light
          refracts through it (ior ~1.45) and the ambient field behind shows
          through. roughness ~0.1 keeps it crisp with a faint frost. */}
      <mesh geometry={bodyGeo} castShadow>
        <meshPhysicalMaterial
          transmission={1}
          thickness={0.5}
          roughness={0.1}
          metalness={0}
          ior={1.45}
          clearcoat={1}
          clearcoatRoughness={0.1}
          reflectivity={0.4}
          transparent
          opacity={1}
          color="#eaf6ff"
          attenuationColor="#cfeaff"
          attenuationDistance={2.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* --- Liquid fill: inner cylinder, ~55% up the body ---------------- */}
      <mesh position={[0, -0.42, 0]} material={liquidMat}>
        <cylinderGeometry args={[0.46, 0.46, 0.95, 48, 1]} />
      </mesh>
      {/* Meniscus: a thin brighter disc at the liquid surface. */}
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.455, 0.455, 0.01, 48]} />
        <meshBasicMaterial color={liquidColor} transparent opacity={0.5} />
      </mesh>

      {/* --- Aluminum crimp ring around the neck -------------------------- */}
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.315, 0.315, 0.2, 48]} />
        <meshStandardMaterial
          color="#b9bec8"
          metalness={1}
          roughness={0.32}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* --- Rubber stopper with a rounded top ---------------------------- */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.27, 0.28, 0.14, 48]} />
        <meshStandardMaterial color="#15161c" roughness={0.75} metalness={0.05} />
      </mesh>
      <mesh position={[0, 1.13, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.27, 40, 24]} />
        <meshStandardMaterial color="#191a21" roughness={0.7} metalness={0.05} />
      </mesh>
    </group>
  );
}
