import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

const GlobeMesh = ({ onReady }) => {
  const meshRef = useRef();
  const [texture, setTexture] = useState(null);
  
  // Preload the texture
  useEffect(() => {
    new THREE.TextureLoader().load(
      'https://unpkg.com/three-globe/example/img/earth-water.png', 
      (loadedTex) => {
        setTexture(loadedTex);
      }
    );
  }, []);

  const uniforms = useMemo(() => {
    if (!texture) return null;
    return {
      uMap: { value: texture },
      uLandColor: { value: new THREE.Color('#a855f7') }, 
      uWaterColor: { value: new THREE.Color('#1a1a1a') } 
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
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec4 mapColor = texture2D(uMap, vUv);
      float isWater = mapColor.r;
      vec3 finalColor = mix(uLandColor, uWaterColor, isWater);
      gl_FragColor = vec4(finalColor, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.4 * delta;
    }
  });

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (texture && meshRef.current) {
       meshRef.current.scale.set(0.1, 0.1, 0.1);
       const tl = gsap.timeline({
         onComplete: () => {
           if (onReadyRef.current) onReadyRef.current();
         }
       });
       
       tl.to(meshRef.current.scale, {
         x: 2.9,
         y: 2.9,
         z: 2.9,
         duration: 2.5,
         ease: "power3.inOut"
       }, 0); 
       
       gsap.fromTo(meshRef.current.rotation, 
         { y: -Math.PI * 1.5 }, 
         { y: 0, duration: 2.5, ease: "power3.inOut" }
       );
    }
  }, [texture]); // Only texture triggers this, not onReady change

  if (!texture) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial 
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

const Globe = ({ onReady }) => {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 45 }} gl={{ alpha: true, antialias: true }}>
      <GlobeMesh onReady={onReady} />
    </Canvas>
  );
};

export default Globe;
