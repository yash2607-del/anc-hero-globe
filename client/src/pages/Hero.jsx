import React, { useEffect, useRef, useState } from 'react';
import Globe from '../components/Globe';
import gsap from 'gsap';

const Hero = () => {
  const wordRef = useRef(null);
  const [isGlobeLoaded, setIsGlobeLoaded] = useState(false);

  const handleReady = React.useCallback(() => {
    setIsGlobeLoaded(true);
  }, []);

  useEffect(() => {
    // Only animate when globe is loaded
    if (!isGlobeLoaded) return;

    // Use a small delay for stable layout or check fonts
    const triggerAnimation = () => {
      const el = wordRef.current;
      if (!el) return;

      const tl = gsap.timeline();
      // Animate word expansion from zero to its natural width
      tl.to(el, {
        width: "auto",
        duration: 1.8,
        ease: "power3.inOut",
        delay: 0.1 
      });
    };

    if ('fonts' in document) {
        document.fonts.ready.then(triggerAnimation);
    } else {
        setTimeout(triggerAnimation, 100);
    }

    const onResize = () => {
      gsap.set(wordRef.current, { width: "auto" });
    };
    
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isGlobeLoaded]);

  return (
    <div className="hero-section">
      <div className="hero-word-container">
        {/* Style starts at 0 to hide it, then GSAP expands it */}
        <div ref={wordRef} className="text-part" style={{ width: 0, overflow: 'hidden' }}>
          <span style={{ display: 'inline-block', paddingRight: '4px' }}>ANC</span>
        </div>
        <div className="globe-wrapper">
          <Globe onReady={() => setIsGlobeLoaded(true)} />
        </div>
      </div>
    </div>
  );
};

export default Hero;
