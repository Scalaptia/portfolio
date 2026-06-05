import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import PixelIcon from "./PixelIcon";

export interface MediaItem {
  type: "image" | "video";
  src: string;
  alt?: string;
  caption?: string;
  description?: string;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const minSwipe = 50;
  const hasMultiple = items.length > 1;

  const currentItem = items[currentIndex];

  const goPrev = useCallback(() => {
    if (!hasMultiple) return;
    onNavigate(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
    setIsLoaded(false);
  }, [currentIndex, hasMultiple, items.length, onNavigate]);

  const goNext = useCallback(() => {
    if (!hasMultiple) return;
    onNavigate(currentIndex === items.length - 1 ? 0 : currentIndex + 1);
    setIsLoaded(false);
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

  // Reset loaded state when item changes
  useEffect(() => {
    setIsLoaded(false);
  }, [currentIndex]);

  if (!isOpen || !currentItem) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
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

      {/* Prev arrow — fixed left side of viewport */}
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

      {/* Next arrow — fixed right side of viewport */}
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

      {/* Content area — click outside media to close */}
      <div
        className="flex flex-col items-center justify-center gap-4 sm:gap-6 w-full h-full px-4 sm:px-20 py-16 sm:py-20"
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
        {/* Media container — fixed min size, click stops propagation */}
        <div
          className="relative border-2 sm:border-4 border-white bg-background shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] p-2 sm:p-3 flex items-center justify-center min-w-[280px] min-h-[200px] sm:min-w-[520px] sm:min-h-[340px] lg:min-w-[600px] lg:min-h-[400px] max-w-full max-h-[55vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-4 h-4 sm:w-6 sm:h-6 border-r-4 border-b-4 border-text/30"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-6 sm:h-6 border-l-4 border-t-4 border-text/30"></div>

          {/* Image */}
          {currentItem.type === "image" && (
            <img
              key={currentIndex}
              src={currentItem.src}
              alt={currentItem.alt || "Gallery image"}
              className="max-w-full max-h-[50vh] sm:max-h-[52vh] object-contain"
              draggable="false"
              onLoad={() => setIsLoaded(true)}
              style={{ display: "block" }}
            />
          )}

          {/* Video */}
          {currentItem.type === "video" && (
            <video
              key={currentIndex}
              controls
              className="max-w-full max-h-[50vh] sm:max-h-[52vh] object-contain"
              src={currentItem.src}
              onLoadedData={() => setIsLoaded(true)}
            />
          )}

          {/* Loading state */}
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="w-8 h-8 border-4 border-text/30 border-t-primary animate-spin"></div>
            </div>
          )}
        </div>

        {/* Info — period + caption + description */}
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

        {/* Dots only */}
        {hasMultiple && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {items.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(i);
                  setIsLoaded(false);
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
