

"use client";
import React from 'react';




import { useState, useEffect, useRef } from 'react';

const slides = [
  { src: '/images/new-launch-img1.webp', alt: 'Launch 1' },
  { src: '/images/new-launch-img2.webp', alt: 'Launch 2' },
  { src: '/images/new-launch-img3.webp', alt: 'Launch 3' },
  { src: '/images/new-launch-img4.webp', alt: 'Launch 4' },
  { src: '/images/new-launch-img5.png', alt: 'Launch 5' },
  { src: '/images/new-launch-img6.webp', alt: 'Launch 6' },
  { src: '/images/new-launch-img7.webp', alt: 'Launch 7' },
];

const SLIDES_PER_VIEW = 4;
const AUTO_PLAY_DELAY = 1500;

const HomeNewLaunch = () => {
  const [startIdx, setStartIdx] = useState(0);
  const timeoutRef = useRef(null);
  const total = slides.length;

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setStartIdx((prev) => (prev + 1) % total);
    }, AUTO_PLAY_DELAY);
    return () => clearTimeout(timeoutRef.current);
  }, [startIdx, total]);

  const prev = () => setStartIdx((prev) => (prev - 1 + total) % total);
  const next = () => setStartIdx((prev) => (prev + 1) % total);

  // Get the visible slides, wrapping around
  const visibleSlides = [];
  for (let i = 0; i < SLIDES_PER_VIEW; i++) {
    visibleSlides.push(slides[(startIdx + i) % total]);
  }

  return (
    <div className="mx-auto w-full max-w-[430px] ">
      <div className="overflow-hidden border border-[#d6b774] bg-white shadow-[0_12px_28px_rgba(79,52,10,0.08)]">
        <div className="">
          <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] px-4 py-2.5 text-center text-[#111]">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em]"><b>New Launch</b></h2>
          </div>
          <div className="relative flex items-center">
            <div className="flex w-full">
              {visibleSlides.map((slide, idx) => (
                <img
                  key={slide.src}
                  src={slide.src}
                  alt={slide.alt}
                  className="block w-full h-[150px] max-w-[120px] object-cover p-0.25 transition-opacity duration-700"
                  style={{ opacity: 1 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeNewLaunch



