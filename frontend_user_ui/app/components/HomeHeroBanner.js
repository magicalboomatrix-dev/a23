

"use client";
import React from 'react';




import { useState, useEffect, useRef } from 'react';

const slides = [
  { src: '/images/banner-img2.jpg', alt: 'Banner 1' },
  { src: '/images/banner-img3.jpg', alt: 'Banner 2' },
  { src: '/images/banner-img4.jpg', alt: 'Banner 3' },
];

const AUTO_PLAY_DELAY = 2500;

const HomeHeroBanner = () => {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, AUTO_PLAY_DELAY);
    return () => clearTimeout(timeoutRef.current);
  }, [current]);

  const goTo = (idx) => setCurrent(idx);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  const next = () => setCurrent((prev) => (prev + 1) % slides.length);

  return (
    <div className="mx-auto w-full max-w-[430px] ">
      <div className="relative overflow-hidden shadow-[0_14px_30px_rgba(0,0,0,0.18)]">
        <div className="relative w-full h-[100px]">
          {slides.map((slide, idx) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              className={`block h-full w-full object-cover absolute top-0 left-0 transition-opacity duration-700 ${idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              style={{ pointerEvents: idx === current ? 'auto' : 'none' }}
            />
          ))}
          {/* Navigation Arrows */}
        </div>
       
      </div>
    </div>
  );
}

export default HomeHeroBanner



