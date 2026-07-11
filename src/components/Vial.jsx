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
//   • Label        : a curved "sticker" wrapped on the body (brand → product
//                    name → research-use line), rendered from a canvas texture.
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
  labelBoost: 2.6, // extra spin multiplier while the label faces away
  maxSpin: 2.2, // rad/s hard cap so hover + boost never gets frantic
  bobAmplitude: 0.06, // world units of vertical travel
  bobFrequency: 1.1, // radians/sec of the bob sine wave
  hoverScale: 1.08, // scale multiplier while hovered
  scaleEase: 8, // how quickly scale approaches its target
  staticTilt: 0.15, // fixed Y angle in reduced-motion mode (label stays legible)
};

// The vial geometry runs y ≈ -0.9 (base) → +1.25 (cap top), so its visual
// centre sits above the origin. Shift the whole group down by this much so it
// frames centred (keeps the cap from clipping the top of tight card frames).
const CENTER_Y = -0.18;

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
  offsetY = 0, // extra vertical nudge (hero pushes the vial down a touch)
  label, // product name printed on the sticker (e.g. "3-RUO")
  ...groupProps
}) {
  const group = useRef();
  const currentSpin = useRef(ANIM.idleSpin);
  const bodyGeo = useVialGeometry();
  const baseY = CENTER_Y + offsetY;

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
      g.position.y = baseY;
      g.scale.setScalar(1);
      return;
    }

    // --- Spin: ease current speed toward idle or hover target -------------
    // Label-aware pacing: the sticker faces +Z (the camera) at rotation.y = 0.
    // `hidden` runs 0 (label dead-centre to camera) → 1 (label fully away);
    // while hidden we multiply the spin up so the label spends less time out
    // of view, then it eases back to the slow drift as it swings around.
    if (!interactive) {
      let targetSpin = hovered ? ANIM.hoverSpin : ANIM.idleSpin;
      if (label) {
        const hidden = (1 - Math.cos(g.rotation.y)) / 2;
        targetSpin *= 1 + ANIM.labelBoost * Math.pow(hidden, 1.6);
        targetSpin = Math.min(targetSpin, ANIM.maxSpin);
      }
      currentSpin.current +=
        (targetSpin - currentSpin.current) * Math.min(1, ANIM.spinEase * dt);
      g.rotation.y += currentSpin.current * dt;
    }

    // --- Bob: gentle suspended-in-fluid sine wave (around baseY) ----------
    const t = state.clock.elapsedTime;
    g.position.y = baseY + Math.sin(t * ANIM.bobFrequency) * ANIM.bobAmplitude;

    // --- Scale: ease up slightly on hover ---------------------------------
    const targetScale = hovered ? ANIM.hoverScale : 1;
    const s = THREE.MathUtils.damp(g.scale.x, targetScale, ANIM.scaleEase, dt);
    g.scale.setScalar(s);
  });

  return (
    <group ref={group} position={[0, baseY, 0]} {...groupProps}>
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

      {/* --- Sticker label wrapped on the body --------------------------- */}
      {label && <VialLabel name={label} />}

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

// ---------------------------------------------------------------------------
// <VialLabel /> — a curved "sticker" wrapped around the front of the body.
// The label art is drawn to a canvas (brand → product name → research line)
// and mapped onto a partial cylinder that hugs the glass. It spins with the
// vial, coming into and out of view as the vial rotates — like a real label.
// ---------------------------------------------------------------------------
function VialLabel({ name }) {
  const texture = useMemo(() => makeLabelTexture(name), [name]);

  // Partial cylinder just outside the glass wall (radius 0.52), centred on +Z
  // (the camera side) so the label faces front when the vial is at rest.
  const thetaLength = 2.0; // ~115° of wrap
  const thetaStart = -thetaLength / 2;

  return (
    <mesh position={[0, -0.05, 0]}>
      <cylinderGeometry
        args={[0.532, 0.532, 0.74, 64, 1, true, thetaStart, thetaLength]}
      />
      <meshStandardMaterial
        map={texture}
        // Self-lit a little so the sticker stays legible even in shadow, while
        // the dark text stays dark (emissiveMap = the same art).
        emissive="#ffffff"
        emissiveMap={texture}
        emissiveIntensity={0.22}
        roughness={0.55}
        metalness={0}
        transparent
        side={THREE.FrontSide}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

/**
 * Draw the sticker art to an offscreen canvas and return a CanvasTexture.
 * Layout (top → bottom): brand mark, product name (auto-fit, wraps to 2 lines
 * if long), and the research-use line in smaller letters.
 */
function makeLabelTexture(name) {
  const W = 700;
  const H = 460;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // --- Sticker panel (rounded, light, subtly graded) --------------------
  const pad = 24;
  const r = 34;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#f7f9fc');
  grad.addColorStop(1, '#e9edf3');
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, r);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(10,12,16,0.12)';
  ctx.stroke();

  const cx = W / 2;

  // --- Brand mark: "Æ AEGIS" -------------------------------------------
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f766e'; // deep teal
  ctx.font = '700 34px Inter, Arial, sans-serif';
  ctx.save();
  ctx.letterSpacing = '6px';
  ctx.fillText('Æ AEGIS', cx, pad + 62);
  ctx.restore();

  // Divider line under the brand
  ctx.strokeStyle = 'rgba(10,12,16,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad + 60, pad + 96);
  ctx.lineTo(W - pad - 60, pad + 96);
  ctx.stroke();

  // --- Product name (auto-fit, up to two lines) -------------------------
  ctx.fillStyle = '#0b0e14';
  drawFittedName(ctx, name, cx, H / 2 + 24, W - pad * 2 - 60);

  // --- Research-use line ------------------------------------------------
  ctx.fillStyle = '#55606e';
  ctx.font = '600 26px Inter, Arial, sans-serif';
  ctx.save();
  ctx.letterSpacing = '3px';
  ctx.fillText('FOR RESEARCH PURPOSES ONLY', cx, H - pad - 40);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Fit `text` into `maxW`, shrinking then wrapping to two lines if needed. */
function drawFittedName(ctx, text, cx, cy, maxW) {
  const setFont = (s) => (ctx.font = `800 ${s}px Inter, Arial, sans-serif`);

  // Try to keep it on one line, shrinking down to a floor.
  let size = 82;
  setFont(size);
  while (ctx.measureText(text).width > maxW && size > 40) {
    size -= 2;
    setFont(size);
  }
  if (ctx.measureText(text).width <= maxW) {
    ctx.fillText(text, cx, cy);
    return;
  }

  // Still too wide → split into two balanced lines and fit those.
  const words = text.split(' ');
  let best = [text, ''];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(' ');
    const l2 = words.slice(i).join(' ');
    const diff = Math.abs(l1.length - l2.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [l1, l2];
    }
  }
  size = 64;
  setFont(size);
  while (
    (ctx.measureText(best[0]).width > maxW ||
      ctx.measureText(best[1]).width > maxW) &&
    size > 30
  ) {
    size -= 2;
    setFont(size);
  }
  const lh = size * 1.15;
  ctx.fillText(best[0], cx, cy - lh / 2);
  ctx.fillText(best[1], cx, cy + lh / 2);
}

/** Rounded-rectangle path helper. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
