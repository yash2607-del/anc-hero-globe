import React, { useEffect, useRef, useState } from 'react';
import Globe from '../components/Globe';
import gsap from 'gsap';

const Hero = () => {
  const heroRef = useRef(null);
  const wordRef = useRef(null);
  const globeWrapperRef = useRef(null);
  const welcomeRef = useRef(null);
  const globeSpinSpeedRef = useRef(0.04);
  const [isGlobeLoaded, setIsGlobeLoaded] = useState(false);
  const [arcsVisible, setArcsVisible] = useState(false);

  const handleReady = React.useCallback(() => {
    setIsGlobeLoaded(true);
  }, []);

  useEffect(() => {
    if (!isGlobeLoaded) return;

    let cancelled = false;
    let tl;

    const runSequence = () => {
      if (cancelled) return;

      const heroEl = heroRef.current;
      const wordEl = wordRef.current;
      const globeEl = globeWrapperRef.current;
      const welcomeEl = welcomeRef.current;
      if (!heroEl || !wordEl || !globeEl || !welcomeEl) return;

      // Reset any GSAP-injected inline styles (important for Fast Refresh / StrictMode)
      gsap.set(wordEl, { clearProps: 'position,left,top,height,zIndex,opacity' });
      gsap.set(globeEl, { clearProps: 'position,left,top,width,height,x,y,zIndex' });
      gsap.set(welcomeEl, { clearProps: 'opacity,visibility' });

      gsap.set(wordEl, { width: 0, opacity: 1, overflow: 'hidden' });
      gsap.set(welcomeEl, { autoAlpha: 0 });
      const chars = welcomeEl.querySelectorAll('.welcome-char');
      gsap.set(chars, { opacity: 0, y: 20 }); // start hidden and slightly lower
      globeSpinSpeedRef.current = 0.04;

      let endLeft = 0;
      let endTop = 0;
      let finalSize = 0;

      tl = gsap.timeline();

      // 1) Reveal the word
      tl.to(wordEl, {
        width: 'auto',
        duration: 1.8,
        ease: 'power3.inOut',
        delay: 0.1,
      });

      tl.to({}, { duration: 0.45 });

      tl.add(() => {
        const heroRect = heroEl.getBoundingClientRect();
        const wordRect = wordEl.getBoundingClientRect();
        const globeRect = globeEl.getBoundingClientRect();

        gsap.set(wordEl, {
          position: 'absolute',
          left: wordRect.left - heroRect.left,
          top: wordRect.top - heroRect.top,
          width: wordRect.width,
          height: wordRect.height,
          zIndex: 10,
        });

        gsap.set(globeEl, {
          position: 'absolute',
          left: globeRect.left - heroRect.left,
          top: globeRect.top - heroRect.top,
          width: globeRect.width,
          height: globeRect.height,
          zIndex: 20,
        });

        finalSize = Math.min(heroRect.width, heroRect.height) * 0.9;
        endLeft = heroRect.width / 2 - finalSize / 2;
        endTop = heroRect.height / 2 - finalSize / 2;
      });

      tl.addLabel('center');

      tl.to(globeSpinSpeedRef, {
        current: 0.07,
        duration: 0.4,
        ease: 'power2.out',
      }, 'center');

      tl.to(globeEl, {
        left: () => endLeft,
        top: () => endTop,
        width: () => finalSize,
        height: () => finalSize,
        duration: 1.35,
        ease: 'power3.inOut',
      }, 'center');

      tl.to(wordEl, {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
      }, 'center+=0.15');

      tl.to(globeSpinSpeedRef, {
        current: 0.04,
        duration: 0.9,
        ease: 'power2.inOut',
      }, 'center+=1.35');

      tl.set(welcomeEl, { autoAlpha: 1 }, 'center+=1.35'); // Make container visible
      tl.to(chars, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.05,
        ease: 'back.out(1.7)' // add a nice little spring effect to the staggered reveal
      }, 'center+=1.35');
      
      tl.call(() => setArcsVisible(true), null, 'center+=1.35');
    };

    if ('fonts' in document) {
      document.fonts.ready.then(runSequence);
    } else {
      setTimeout(runSequence, 100);
    }

    return () => {
      cancelled = true;
      if (tl) tl.kill();
      globeSpinSpeedRef.current = 0.04;
    };
  }, [isGlobeLoaded]);

  return (
    <div ref={heroRef} className="hero-section">
      <div className="hero-word-container">
        <div ref={wordRef} className="text-part" style={{ width: 0, overflow: 'hidden' }}>
          <span style={{ display: 'inline-block', paddingRight: '4px' }}>ANC</span>
        </div>
        <div ref={globeWrapperRef} className="globe-wrapper">
          <Globe onReady={handleReady} spinSpeedRef={globeSpinSpeedRef} showArcs={arcsVisible} />
        </div>
      </div>

      <div ref={welcomeRef} className="welcome-text">
        {"WELCOME TO ANC".split('').map((char, index) => (
          <span key={index} className="welcome-char" style={{ display: 'inline-block' }}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Hero;
