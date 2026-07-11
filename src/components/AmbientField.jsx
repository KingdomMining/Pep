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
//   Bioregulators   → soft concentric pulsing rings / ripple field (amber)
//   Modulators      → oscillating lissajous ribbon (violet)
//   Powders         → drifting fine-grain particle dust (white/silver)
//
// All fields sit slightly behind the vial (z ≈ -1.2) and are scaled by the
// `intensity` prop (particle counts drop on mobile / when hovered we brighten).
// ---------------------------------------------------------------------------

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
      return <RippleRings {...common} />;
    case 'Modulators':
      return <LissajousRibbon {...common} />;
    case 'Powders':
      return <DustField {...common} />;
    case 'Peptides':
    default:
      return <RisingStream liquidColor={liquidColor} {...common} />;
  }
}

// A soft round sprite so particles read as glowing points, not hard squares.
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
// Particles drift upward and wrap back to the bottom; small X/Z sway.
// ---------------------------------------------------------------------------
function RisingStream({ liquidColor, particleScale, reducedMotion, hovered }) {
  const points = useRef();
  const sprite = useSprite();
  const count = Math.max(40, Math.round(260 * particleScale));

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2.6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
      positions[i * 3 + 2] = -0.6 - Math.random() * 1.4;
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
      arr[i * 3 + 1] += dt * 0.35; // rise
      if (arr[i * 3 + 1] > 1.8) arr[i * 3 + 1] = -1.8; // wrap
      // gentle horizontal sway keyed to a per-particle seed
      arr[i * 3 + 0] += Math.sin(t * 0.5 + seeds[i]) * dt * 0.06;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points} position={[0, 0, 0]}>
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
        size={hovered ? 0.14 : 0.11}
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
// braid around a shared vertical axis and visually merge in the middle.
// ---------------------------------------------------------------------------
function BlendCurrents({ liquidColor, particleScale, reducedMotion, hovered }) {
  const a = useRef();
  const b = useRef();
  const sprite = useSprite();
  const count = Math.max(30, Math.round(150 * particleScale));

  const build = () => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
      positions[i * 3 + 2] = -0.8 - Math.random() * 1.0;
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
        arr[i * 3 + 1] += dt * 0.3;
        if (arr[i * 3 + 1] > 1.8) arr[i * 3 + 1] = -1.8;
        // helix: x oscillates with height + time, opposite phase per stream
        const phase = arr[i * 3 + 1] * 1.4 + t * 0.6 + stream.seeds[i];
        arr[i * 3 + 0] = Math.sin(phase) * 0.7 * dir;
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
          size={hovered ? 0.15 : 0.12}
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
          size={hovered ? 0.15 : 0.12}
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
// Bioregulators → soft concentric pulsing rings / ripple field, warm amber.
// A stack of ring meshes whose scale + opacity pulse outward on a phase offset.
// ---------------------------------------------------------------------------
function RippleRings({ particleScale, reducedMotion, hovered }) {
  const group = useRef();
  const ringCount = Math.max(4, Math.round(7 * particleScale));
  const rings = useMemo(
    () => new Array(ringCount).fill(0).map((_, i) => i / ringCount),
    [ringCount]
  );
  const color = CATEGORY_ACCENT.Bioregulators;

  useFrame((state) => {
    if (reducedMotion || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((ring, i) => {
      // phase travels outward; each ring offset so they ripple in sequence
      const phase = (t * 0.4 + rings[i]) % 1;
      const scale = 0.4 + phase * 2.4;
      ring.scale.set(scale, scale, scale);
      ring.material.opacity = (1 - phase) * (hovered ? 0.5 : 0.35);
    });
  });

  return (
    <group ref={group} position={[0, 0, -1.1]}>
      {rings.map((_, i) => (
        <mesh key={i} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.62, 0.7, 80]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Modulators → oscillating waveform / lissajous ribbon, violet.
// A line traced along a lissajous curve whose phase advances over time, so the
// ribbon appears to oscillate and fold through itself.
// ---------------------------------------------------------------------------
function LissajousRibbon({ particleScale, reducedMotion, hovered }) {
  const line = useRef();
  const segs = Math.max(120, Math.round(320 * particleScale));
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
    for (let i = 0; i < segs; i++) {
      const u = (i / (segs - 1)) * Math.PI * 2;
      arr[i * 3 + 0] = Math.sin(a * u + delta) * 1.15;
      arr[i * 3 + 1] = Math.sin(b * u) * 1.15;
      arr[i * 3 + 2] = -1.1 + Math.cos(u + t * 0.2) * 0.15;
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
// Many tiny slow particles with a lazy brownian-ish drift; wraps in a box.
// ---------------------------------------------------------------------------
function DustField({ particleScale, reducedMotion, hovered }) {
  const points = useRef();
  const sprite = useSprite();
  const count = Math.max(60, Math.round(340 * particleScale));

  const { positions, vel } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 3.0;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.0;
      positions[i * 3 + 2] = -0.5 - Math.random() * 1.6;
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
      for (let k = 0; k < 3; k++) {
        arr[i * 3 + k] += vel[i * 3 + k] * dt * 12;
        // soft wrap inside a 3-unit box centered on the vial
        const limit = k === 2 ? 2.1 : 1.6;
        if (arr[i * 3 + k] > limit) arr[i * 3 + k] = -limit;
        if (arr[i * 3 + k] < -limit) arr[i * 3 + k] = limit;
      }
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
        size={hovered ? 0.075 : 0.06}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
