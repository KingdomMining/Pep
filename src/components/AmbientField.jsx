import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CATEGORY_ACCENT } from '../data/products.js';

// ---------------------------------------------------------------------------
// <AmbientField category=... /> — a UNIQUE abstract mood field rendered BEHIND
// each vial, keyed purely to the product's research category.
//
// These are aesthetic only. They do NOT depict or imply any physiological
// effect — they exist to give each category a distinct visual signature:
//
//   Peptides        → slow rising luminescent particle stream (teal/cyan)
//   Peptide Blends  → two interweaving currents in contrasting hues, merging
//   Bioregulators   → warm amber "aurora bloom": breathing halos + drift embers
//   Modulators      → oscillating lissajous ribbon (violet)
//   Powders         → drifting fine-grain particle dust (white/silver)
//
// Everything lives on a BACKGROUND SLAB centered at BACK_Z, well behind the
// vial (which sits around z = 0), and is spread WIDE in X/Y so the effect fills
// the whole frame as a true backdrop rather than crowding around the glass.
// SPREAD_X/Y are sized to more than cover the camera frustum at that depth.
// ---------------------------------------------------------------------------

const BACK_Z = -4.2; // depth of the background slab (vial is ~0)
const SLAB_DEPTH = 2.0; // how far particles range in front of/behind BACK_Z
const SPREAD_X = 5.0; // half-width of the field (covers frame at BACK_Z)
const SPREAD_Y = 3.4; // half-height of the field

export default function AmbientField({
  category = 'Peptides',
  liquidColor,
  particleScale = 1,
  reducedMotion = false,
  hovered = false,
}) {
  const common = { particleScale, reducedMotion, hovered };
  switch (category) {
    case 'Peptide Blends':
      return <BlendCurrents liquidColor={liquidColor} {...common} />;
    case 'Bioregulators':
      return <AuroraBloom {...common} />;
    case 'Modulators':
      return <LissajousRibbon {...common} />;
    case 'Powders':
      return <DustField {...common} />;
    case 'Peptides':
    default:
      return <RisingStream liquidColor={liquidColor} {...common} />;
  }
}

// A soft round sprite so particles/halos read as glowing light, not hard shapes.
function useSprite() {
  return useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
}

// ---------------------------------------------------------------------------
// Peptides → slow rising luminescent particle stream, cool teal/cyan.
// Particles drift upward across the whole background slab and wrap around.
// ---------------------------------------------------------------------------
function RisingStream({ liquidColor, particleScale, reducedMotion, hovered }) {
  const points = useRef();
  const sprite = useSprite();
  const count = Math.max(60, Math.round(320 * particleScale));

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2 * SPREAD_X;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * SPREAD_Y;
      positions[i * 3 + 2] = BACK_Z - Math.random() * SLAB_DEPTH;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    return { positions, seeds };
  }, [count]);

  useFrame((state, delta) => {
    if (reducedMotion || !points.current) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const arr = points.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += dt * 0.45; // rise
      if (arr[i * 3 + 1] > SPREAD_Y) arr[i * 3 + 1] = -SPREAD_Y; // wrap
      arr[i * 3 + 0] += Math.sin(t * 0.5 + seeds[i]) * dt * 0.08; // sway
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        color={liquidColor || CATEGORY_ACCENT.Peptides}
        size={hovered ? 0.22 : 0.18}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Peptide Blends → two interweaving particle currents in contrasting hues that
// braid around a shared vertical axis across the background and visually merge.
// ---------------------------------------------------------------------------
function BlendCurrents({ liquidColor, particleScale, reducedMotion, hovered }) {
  const a = useRef();
  const b = useRef();
  const sprite = useSprite();
  const count = Math.max(40, Math.round(190 * particleScale));

  const build = () => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * SPREAD_Y;
      positions[i * 3 + 2] = BACK_Z - Math.random() * SLAB_DEPTH;
      seeds[i] = (i / count) * Math.PI * 2;
    }
    return { positions, seeds };
  };

  const streamA = useMemo(build, [count]);
  const streamB = useMemo(build, [count]);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    for (const [ref, stream, dir] of [
      [a, streamA, 1],
      [b, streamB, -1],
    ]) {
      if (!ref.current) continue;
      const arr = ref.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += dt * 0.22; // rise (slowed)
        if (arr[i * 3 + 1] > SPREAD_Y) arr[i * 3 + 1] = -SPREAD_Y;
        // wide helix: x oscillates with height + time, opposite phase per
        // stream. The time term is kept gentle so the braid drifts calmly.
        const phase = arr[i * 3 + 1] * 1.1 + t * 0.22 + stream.seeds[i];
        arr[i * 3 + 0] = Math.sin(phase) * SPREAD_X * 0.7 * dir;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const warm = liquidColor || CATEGORY_ACCENT['Peptide Blends'];
  const cool = CATEGORY_ACCENT.Peptides; // contrasting second hue

  return (
    <group>
      <points ref={a}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={streamA.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          map={sprite}
          color={warm}
          size={hovered ? 0.22 : 0.18}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      <points ref={b}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={streamB.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          map={sprite}
          color={cool}
          size={hovered ? 0.22 : 0.18}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Bioregulators (GHK-Cu) → warm amber "aurora bloom".
// A soft central glow that slowly breathes, a few large soft halos that expand
// and fade outward (a gentle ripple, but with no hard geometric edges), and a
// scatter of slow drifting embers. Camera-facing sprites, so it always reads as
// a diffuse field of warm light filling the background behind the vial.
// ---------------------------------------------------------------------------
function AuroraBloom({ particleScale, reducedMotion, hovered }) {
  const haloGroup = useRef();
  const glow = useRef();
  const embers = useRef();
  const sprite = useSprite();
  const color = CATEGORY_ACCENT.Bioregulators; // warm amber

  // A handful of expanding halos, each on its own phase offset.
  const haloCount = Math.max(3, Math.round(5 * particleScale));
  const haloPhases = useMemo(
    () => new Array(haloCount).fill(0).map((_, i) => i / haloCount),
    [haloCount]
  );

  // Slow drifting embers scattered across the slab. Positions are LOCAL to the
  // group (which is already offset to BACK_Z), so z stays a small [-SLAB, 0].
  const emberCount = Math.max(30, Math.round(120 * particleScale));
  const embersData = useMemo(() => {
    const positions = new Float32Array(emberCount * 3);
    const seeds = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2 * SPREAD_X;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * SPREAD_Y;
      positions[i * 3 + 2] = -Math.random() * SLAB_DEPTH;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    return { positions, seeds };
  }, [emberCount]);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Expanding, fading halos → a soft ripple.
    if (haloGroup.current) {
      haloGroup.current.children.forEach((halo, i) => {
        const phase = (t * 0.18 + haloPhases[i]) % 1;
        const s = 1.2 + phase * 6.5; // grows outward and large
        halo.scale.set(s, s, 1);
        halo.material.opacity = (1 - phase) * (hovered ? 0.32 : 0.22);
      });
    }

    // Central glow breathes gently.
    if (glow.current) {
      const b = 4.4 + Math.sin(t * 0.6) * 0.5;
      glow.current.scale.set(b, b, 1);
      glow.current.material.opacity = 0.28 + Math.sin(t * 0.6) * 0.06;
    }

    // Embers drift slowly upward and sway.
    if (embers.current) {
      const arr = embers.current.geometry.attributes.position.array;
      const { seeds } = embersData;
      for (let i = 0; i < emberCount; i++) {
        arr[i * 3 + 1] += dt * 0.12;
        if (arr[i * 3 + 1] > SPREAD_Y) arr[i * 3 + 1] = -SPREAD_Y;
        arr[i * 3 + 0] += Math.sin(t * 0.3 + seeds[i]) * dt * 0.05;
      }
      embers.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, BACK_Z]}>
      {/* Central warm glow */}
      <sprite ref={glow} scale={[4.4, 4.4, 1]}>
        <spriteMaterial
          map={sprite}
          color={color}
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* Expanding soft halos (the ripple) */}
      <group ref={haloGroup}>
        {haloPhases.map((_, i) => (
          <sprite key={i} scale={[1.2, 1.2, 1]}>
            <spriteMaterial
              map={sprite}
              color={color}
              transparent
              opacity={0.2}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        ))}
      </group>

      {/* Drifting embers (positions are local to this BACK_Z group) */}
      <points ref={embers}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={emberCount}
            array={embersData.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          map={sprite}
          color={color}
          size={hovered ? 0.16 : 0.13}
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Modulators → oscillating waveform / lissajous ribbon, violet.
// A line traced along a lissajous curve whose phase advances over time, scaled
// wide so it spans the background behind the vial.
// ---------------------------------------------------------------------------
function LissajousRibbon({ particleScale, reducedMotion, hovered }) {
  const line = useRef();
  const segs = Math.max(160, Math.round(360 * particleScale));
  const color = CATEGORY_ACCENT.Modulators;

  const positions = useMemo(() => new Float32Array(segs * 3), [segs]);

  useFrame((state) => {
    if (reducedMotion || !line.current) return;
    const t = state.clock.elapsedTime;
    const arr = line.current.geometry.attributes.position.array;
    // Lissajous: x = A sin(a·u + δ), y = B sin(b·u), with δ drifting in time.
    const a = 3,
      b = 2;
    const delta = t * 0.4;
    const AX = SPREAD_X * 0.78;
    const AY = SPREAD_Y * 0.82;
    for (let i = 0; i < segs; i++) {
      const u = (i / (segs - 1)) * Math.PI * 2;
      arr[i * 3 + 0] = Math.sin(a * u + delta) * AX;
      arr[i * 3 + 1] = Math.sin(b * u) * AY;
      arr[i * 3 + 2] = BACK_Z + Math.cos(u + t * 0.2) * 0.3;
    }
    line.current.geometry.attributes.position.needsUpdate = true;
    line.current.geometry.computeBoundingSphere();
  });

  return (
    <line ref={line}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={segs}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={hovered ? 0.9 : 0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </line>
  );
}

// ---------------------------------------------------------------------------
// Powders → drifting fine-grain particle dust, muted white/silver.
// Many tiny slow particles with a lazy brownian-ish drift filling the slab.
// ---------------------------------------------------------------------------
function DustField({ particleScale, reducedMotion, hovered }) {
  const points = useRef();
  const sprite = useSprite();
  const count = Math.max(80, Math.round(420 * particleScale));

  const { positions, vel } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2 * SPREAD_X;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * SPREAD_Y;
      positions[i * 3 + 2] = BACK_Z - Math.random() * SLAB_DEPTH;
      vel[i * 3 + 0] = (Math.random() - 0.5) * 0.04;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    return { positions, vel };
  }, [count]);

  useFrame((state, delta) => {
    if (reducedMotion || !points.current) return;
    const dt = Math.min(delta, 0.05);
    const arr = points.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] += vel[i * 3 + 0] * dt * 12;
      arr[i * 3 + 1] += vel[i * 3 + 1] * dt * 12;
      arr[i * 3 + 2] += vel[i * 3 + 2] * dt * 12;
      if (arr[i * 3 + 0] > SPREAD_X) arr[i * 3 + 0] = -SPREAD_X;
      if (arr[i * 3 + 0] < -SPREAD_X) arr[i * 3 + 0] = SPREAD_X;
      if (arr[i * 3 + 1] > SPREAD_Y) arr[i * 3 + 1] = -SPREAD_Y;
      if (arr[i * 3 + 1] < -SPREAD_Y) arr[i * 3 + 1] = SPREAD_Y;
      const zc = arr[i * 3 + 2];
      if (zc > BACK_Z + SLAB_DEPTH) arr[i * 3 + 2] = BACK_Z - SLAB_DEPTH;
      if (zc < BACK_Z - SLAB_DEPTH) arr[i * 3 + 2] = BACK_Z + SLAB_DEPTH;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        color={CATEGORY_ACCENT.Powders}
        size={hovered ? 0.1 : 0.08}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
