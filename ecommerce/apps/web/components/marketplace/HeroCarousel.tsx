"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { HeroSlide } from "@/lib/api/public";

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ slides }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const displaySlides = slides && slides.length > 0 ? slides : [];

  useEffect(() => {
    if (displaySlides.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displaySlides.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [displaySlides.length, isPaused]);

  if (displaySlides.length === 0) return null;

  const currentSlide = displaySlides[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displaySlides.length) % displaySlides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displaySlides.length);
  };

  return (
    <div
      className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full aspect-[16/7] min-h-[340px] sm:min-h-[400px] lg:min-h-[440px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900 group">
        {/* Background Slide Images & Gradients */}
        {displaySlides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Desktop / Mobile Background Image */}
              <picture className="absolute inset-0 w-full h-full">
                {slide.mobile_image && <source media="(max-width: 640px)" srcSet={slide.mobile_image} />}
                <img
                  src={slide.desktop_image}
                  alt={slide.title}
                  loading={index === 0 ? "eager" : "lazy"}
                  className="w-full h-full object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-1000"
                />
              </picture>

              {/* Dark Gradient Overlay for Contrast */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30"></div>

              {/* Grid Layout: Left Content & Right Composition */}
              <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-12 md:px-16 grid grid-cols-1 md:grid-cols-12 items-center text-left text-white z-20 gap-6">
                <div className="md:col-span-7 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-600/90 text-white border border-blue-400/40 w-fit mb-3 shadow-sm backdrop-blur-xs">
                    <Sparkles className="w-3 h-3 text-cyan-300" />
                    <span>{slide.badge_text || "DIGIBAZAR MARKETPLACE"}</span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-3 text-white whitespace-pre-line">
                    {slide.title}
                  </h2>

                  <p className="text-sm sm:text-base font-medium text-slate-300 mb-6 leading-relaxed max-w-xl">
                    {slide.subtitle || "Shop products from trusted stores across Pakistan."}
                  </p>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      href={slide.button_url || "/search"}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                      <span>Shop Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <Link
                      href="/search"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm transition-all backdrop-blur-xs"
                    >
                      <span>Explore Categories</span>
                    </Link>
                  </div>
                </div>

                {/* Right side Product Composition Image */}
                <div className="hidden md:flex md:col-span-5 items-center justify-center relative">
                  <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white/5 backdrop-blur-xs p-2">
                    <img
                      src={index === 0 ? "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"}
                      alt="Marketplace Products"
                      className="w-full h-full object-cover rounded-xl shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Navigation Arrows */}
        {displaySlides.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-slate-900/40 hover:bg-slate-900/80 text-white/80 hover:text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-slate-900/40 hover:bg-slate-900/80 text-white/80 hover:text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Pagination Indicators (Dots) */}
        {displaySlides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/40 backdrop-blur-md border border-white/10">
            {displaySlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex ? "w-6 h-2 bg-blue-500 shadow-xs" : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
