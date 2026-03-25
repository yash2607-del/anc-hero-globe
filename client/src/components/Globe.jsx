import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

const hexToRgb01 = (hex) => {
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return [r, g, b];
};

const makeLinearColorFromHex = (hex) => {
  const color = new THREE.Color(hex);
  const srgb = hexToRgb01(hex);

  if (srgb && typeof color.convertSRGBToLinear === 'function') {
    const eps = 1e-6;
    const looksLikeSrgb =
      Math.abs(color.r - srgb[0]) < eps &&
      Math.abs(color.g - srgb[1]) < eps &&
      Math.abs(color.b - srgb[2]) < eps;
    if (looksLikeSrgb) color.convertSRGBToLinear();
  }

  return color;
};

const getPointOnSphere = (radius) => {
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

const ArcLines = ({ count = 7, radius = 1, alphaRef }) => {
  const lines = useMemo(() => {
    const arr = [];
    let seed = 1234;
    
    // Seeded pseudo-random function so the pattern is identical on every load
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const getSeededPoint = (r) => {
      const u = random();
      const v = random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    };

    for (let i = 0; i < count; i++) {
      const start = getSeededPoint(radius);
      let end, dist;
      
      // Enforce a minimum distance to guarantee "big" long arcs
      do {
        end = getSeededPoint(radius);
        dist = start.distanceTo(end);
      } while (dist < 1.2);

      const mid = start.clone().lerp(end, 0.5);
      // Make the arch even higher so it's more prominent and comes out in front
      mid.normalize().multiplyScalar(radius + Math.max(0.4, dist * 0.6));
      
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      // Use TubeGeometry to make the line thick/bold, reduced thickness slightly
      const geom = new THREE.TubeGeometry(curve, 64, 0.004, 8, false);
      
      arr.push({
        geometry: geom,
        speed: 0.06 + random() * 0.08, // Keep it slow deterministically
        offset: random() * 10
      });
    }
    return arr;
  }, [count, radius]);

  const materials = useMemo(() => {
    return lines.map(_ => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: makeLinearColorFromHex('#9D3DFE') },
          uGlobalAlpha: { value: 0 } // default alpha
        },
        vertexShader: `
          varying float vFrac;
          void main() {
            vFrac = uv.x; // TubeGeometry uv.x goes from 0 to 1 along the path
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uGlobalAlpha;
          varying float vFrac;
          void main() {
             float dist = fract(uTime - vFrac);
             float alpha = (1.0 - smoothstep(0.0, 0.4, dist)) * 0.9;
             if (vFrac < 0.05 || vFrac > 0.95) {
                alpha *= smoothstep(0.0, 0.05, min(vFrac, 1.0 - vFrac));
             }
             gl_FragColor = vec4(uColor, alpha * uGlobalAlpha);
          }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
    });
  }, [lines]);

  useFrame((state) => {
    const ga = alphaRef && alphaRef.current !== undefined ? alphaRef.current.value : 1;
    materials.forEach((mat, i) => {
       mat.uniforms.uTime.value = (state.clock.elapsedTime * lines[i].speed) + lines[i].offset;
       mat.uniforms.uGlobalAlpha.value = ga;
    });
  });

  return (
    <group>
      {lines.map((item, i) => (
        <mesh key={i} geometry={item.geometry} material={materials[i]} />
      ))}
    </group>
  );
};

const GlobeMesh = ({ onReady, spinSpeedRef, showArcs }) => {
  const meshRef = useRef();
  const arcsAlphaRef = useRef({ value: 0 }); // Use an object for GSAP targeting
  const [texture, setTexture] = useState(null);
  
  useEffect(() => {
    new THREE.TextureLoader().load(
      'https://unpkg.com/three-globe/example/img/earth-water.png', 
      (loadedTex) => {
        loadedTex.generateMipmaps = false;
        loadedTex.minFilter = THREE.LinearFilter;
        loadedTex.magFilter = THREE.LinearFilter;
        loadedTex.needsUpdate = true;
        setTexture(loadedTex);
      }
    );
  }, []);

  const uniforms = useMemo(() => {
    if (!texture) return null;
    return {
      uMap: { value: texture },
      uLandColor: { value: makeLinearColorFromHex('#9D3DFE') },
      uWaterColor: { value: makeLinearColorFromHex('#0a0a0a') },
      uMaskReveal: { value: 0 }
    };
  }, [texture]);

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uMap;
    uniform vec3 uLandColor;
    uniform vec3 uWaterColor;
    uniform float uMaskReveal;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec4 mapColor = texture2D(uMap, vUv);
      // Force a crisp water/land mask so water pixels can perfectly match the page background
      float softWaterMask = smoothstep(0.35, 0.65, mapColor.r);
      float hardWaterMask = step(0.5, mapColor.r);
      float isWater = mix(softWaterMask, hardWaterMask, uMaskReveal);
      vec3 finalColor = mix(uLandColor, uWaterColor, isWater);
      gl_FragColor = vec4(finalColor, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  useFrame((state, delta) => {
    if (meshRef.current) {
      const speed = spinSpeedRef?.current ?? 0.04;
      meshRef.current.rotation.y += speed * delta;
    }
  });

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!texture || !meshRef.current || !uniforms) return undefined;

    meshRef.current.scale.set(0.1, 0.1, 0.1);
    uniforms.uMaskReveal.value = 0;

    const tl = gsap.timeline();

    tl.to(meshRef.current.scale, {
      x: 2.9,
      y: 2.9,
      z: 2.9,
      duration: 2.5,
      ease: 'power3.inOut'
    }, 0);

    tl.fromTo(meshRef.current.rotation,
      { y: -Math.PI * 0.55 },
      { y: 0, duration: 2.5, ease: 'power3.inOut' },
      0
    );

    tl.call(() => {
      if (onReadyRef.current) onReadyRef.current();
    }, null, 2.5);

    tl.to(uniforms.uMaskReveal, {
      value: 1,
      duration: 0.45,
      ease: 'power2.out'
    }, 2.5);

    return () => {
      tl.kill();
    };
  }, [texture, uniforms]);

  useEffect(() => {
    if (showArcs) {
      gsap.to(arcsAlphaRef.current, {
        value: 1,
        duration: 1.0,
        ease: 'power2.inOut'
      });
    } else {
      arcsAlphaRef.current.value = 0;
    }
  }, [showArcs]);

  if (!texture) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial 
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        toneMapped={false}
      />
      {texture && <ArcLines count={7} radius={1} alphaRef={arcsAlphaRef} />}
    </mesh>
  );
};

const Globe = ({ onReady, spinSpeedRef, showArcs }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      style={{ background: 'transparent' }}
    >
      <GlobeMesh onReady={onReady} spinSpeedRef={spinSpeedRef} showArcs={showArcs} />
    </Canvas>
  );
};

export default Globe;
