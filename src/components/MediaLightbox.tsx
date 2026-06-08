import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import PixelIcon from "./PixelIcon";

export interface MediaItem {
  type: "image" | "video";
  src: string;
  alt?: string;
  caption?: string;
  description?: string;
  lightboxSrc?: string;
}

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export function MediaLightbox({
  isOpen,
  onClose,
  items,
  currentIndex,
  onNavigate,
}: MediaLightboxProps) {
  const [touchStartX, setTouchStartX] = useState(0);
  const minSwipe = 50;
  const hasMultiple = items.length > 1;

  const currentItem = items[currentIndex];

  const goPrev = useCallback(() => {
    if (!hasMultiple) return;
    onNavigate(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
  }, [currentIndex, hasMultiple, items.length, onNavigate]);

  const goNext = useCallback(() => {
    if (!hasMultiple) return;
    onNavigate(currentIndex === items.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, hasMultiple, items.length, onNavigate]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, goPrev, goNext]);

  // Preload adjacent
  useEffect(() => {
    if (!isOpen || !hasMultiple) return;
    const preload = (idx: number) => {
      if (idx < 0 || idx >= items.length) return;
      const item = items[idx];
      if (item.type === "image") {
        const img = new Image();
        img.src = item.src;
      }
    };
    preload(currentIndex - 1);
    preload(currentIndex + 1);
  }, [currentIndex, isOpen, hasMultiple, items]);

  if (!isOpen || !currentItem) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media gallery"
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2.5 sm:p-3 border-2 border-white bg-text text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] transition-all duration-150 z-50"
        aria-label="Close"
      >
        <PixelIcon name="x" className="w-5 h-5" />
      </button>

      {/* Prev arrow */}
      {hasMultiple && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 border-2 border-white bg-text text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] transition-all duration-150 z-50 hidden sm:flex items-center justify-center"
          aria-label="Previous"
        >
          <PixelIcon name="arrow-left" className="w-6 h-6" />
        </button>
      )}

      {/* Next arrow */}
      {hasMultiple && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 border-2 border-white bg-text text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] transition-all duration-150 z-50 hidden sm:flex items-center justify-center"
          aria-label="Next"
        >
          <PixelIcon name="arrow-right" className="w-6 h-6" />
        </button>
      )}

      {/* Content — no container, image sizes naturally on dark backdrop */}
      <div
        className="flex flex-col items-center justify-center gap-4 sm:gap-6 w-full h-full px-4 sm:px-8 lg:px-16 py-14 sm:py-16 lg:py-20"
        onTouchStart={(e) => {
          setTouchStartX(e.changedTouches[0].screenX);
        }}
        onTouchEnd={(e) => {
          if (!hasMultiple) return;
          const distance = touchStartX - e.changedTouches[0].screenX;
          if (Math.abs(distance) > minSwipe) {
            if (distance > 0) goNext();
            else goPrev();
          }
        }}
      >
        {/* Image */}
        {currentItem.type === "image" && (
          <img
            src={currentItem.lightboxSrc || currentItem.src}
            alt={currentItem.alt || "Gallery image"}
            className="max-w-full max-h-[70vh] lg:max-h-[82vh] object-contain select-none"
            draggable="false"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Video */}
        {currentItem.type === "video" && (
          <video
            controls
            className="max-w-full max-h-[70vh] lg:max-h-[82vh] object-contain"
            src={currentItem.lightboxSrc || currentItem.src}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Caption + description */}
        {currentItem.caption && (
          <div className="text-center max-w-lg px-4">
            <span className="text-white/40 font-ubuntu-mono text-xs">{currentItem.caption}</span>
            {currentItem.description && (
              <p className="text-white/70 font-open-sans text-sm sm:text-base mt-1 leading-relaxed">
                {currentItem.description}
              </p>
            )}
          </div>
        )}

        {/* Dots */}
        {hasMultiple && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {items.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(i);
                }}
                className={`w-3 h-3 border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] transition-colors duration-150 flex-shrink-0 ${
                  i === currentIndex
                    ? "bg-primary"
                    : "bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`Go to item ${i + 1}`}
                aria-current={i === currentIndex ? "true" : "false"}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
