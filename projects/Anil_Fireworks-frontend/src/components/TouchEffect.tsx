import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export const GlobalTouchEffect: React.FC<{
  glowColor?: string;
}> = ({ glowColor = '167, 139, 250' }) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 1. Spotlight effect tracking mouse globally
    const spotlight = document.createElement('div');
    spotlight.style.cssText = `
      position: fixed;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.08) 0%,
        rgba(${glowColor}, 0.04) 20%,
        rgba(${glowColor}, 0.01) 40%,
        transparent 70%
      );
      z-index: 9999;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    let fadeOutTimeout: number;

    const handleMouseMove = (e: MouseEvent) => {
      clearTimeout(fadeOutTimeout);
      
      if (spotlightRef.current) {
        spotlightRef.current.style.opacity = '1';
        gsap.to(spotlightRef.current, {
          left: e.clientX,
          top: e.clientY,
          duration: 0.1,
          ease: 'power2.out'
        });
      }

      // Fade out if mouse stops moving for a while
      fadeOutTimeout = window.setTimeout(() => {
        if (spotlightRef.current) {
           spotlightRef.current.style.opacity = '0';
        }
      }, 1500);
    };

    const handleMouseLeave = () => {
      if (spotlightRef.current) {
        spotlightRef.current.style.opacity = '0';
      }
    };

    // 2. Click ripple effect globally
    const handleClick = (e: MouseEvent) => {
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: fixed;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.6) 0%, rgba(${glowColor}, 0.2) 40%, transparent 80%);
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        transform: translate(-50%, -50%) scale(0);
        pointer-events: none;
        z-index: 10000;
        mix-blend-mode: screen;
      `;
      document.body.appendChild(ripple);

      gsap.fromTo(ripple, {
        scale: 0,
        opacity: 1
      }, {
        scale: 3,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => ripple.remove()
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('click', handleClick);
      spotlightRef.current?.remove();
    };
  }, [glowColor]);

  return null;
};
