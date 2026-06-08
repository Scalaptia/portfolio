import { useState, useCallback, useEffect, useRef } from "react";
import PixelIcon from "./PixelIcon";
import { MediaLightbox, type MediaItem } from "./MediaLightbox";

interface MediaGalleryProps {
  items: MediaItem[];
  mode: "carousel" | "grid";
  swipeHint?: string;
  className?: string;
}

export function MediaGallery({
  items,
  mode,
  swipeHint = "← Swipe →",
  className = "",
}: MediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const hasMultiple = items.length > 1;

  // Preload adjacent images in carousel mode
  useEffect(() => {
    if (mode !== "carousel") return;
    const preload = (idx: number) => {
      if (idx < 0 || idx >= items.length) return;
      const item = items[idx];
      if (item.type === "image") {
        const img = new Image();
        img.src = item.src;
      }
    };
    preload(activeIndex - 1);
    preload(activeIndex + 1);
  }, [activeIndex, items, mode]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const openLightbox = useCallback(
    (index: number) => {
      setActiveIndex(index);
      setIsLightboxOpen(true);
    },
    [],
  );

  // Carousel touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !hasMultiple) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  if (mode === "carousel") {
    const activeItem = items[activeIndex];
    return (
      <>
        <MediaLightbox
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          items={items}
          currentIndex={activeIndex}
          onNavigate={(i) => setActiveIndex(i)}
        />

        <div ref={carouselRef} className={`relative group ${className}`}>
          {/* Carousel viewport */}
          <div
            className="relative w-full aspect-video cursor-pointer bg-background/50 overflow-hidden border-2 sm:border-4 border-text shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] sm:shadow-[6px_6px_0px_0px_rgba(65,44,71,1)] touch-pan-y select-none"
            onClick={() => openLightbox(activeIndex)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {items.map((item, index) => (
              <div
                key={index}
                className={`absolute top-0 left-0 w-full h-full transition-all duration-500 ease-in-out ${
                  index === activeIndex
                    ? "opacity-100 z-10 scale-100"
                    : "opacity-0 z-0 scale-105"
                }`}
                style={{
                  backfaceVisibility: "hidden",
                  filter: index === activeIndex ? "none" : "blur(1px)",
                }}
              >
                {item.type === "image" ? (
                  <img
                    src={item.src}
                    alt={item.alt || `Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                    draggable="false"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                ) : (
                  <video
                    className="w-full h-full object-cover"
                    src={item.src}
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}
              </div>
            ))}

            {/* Swipe hint */}
            {hasMultiple && activeIndex === 0 && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-text/70 text-xs font-ubuntu-mono bg-white/90 px-3 py-1 border border-text/30 sm:hidden pointer-events-none animate-pulse">
                {swipeHint}
              </div>
            )}
          </div>

          {/* Carousel arrows — Desktop */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] hover:bg-background transition-colors duration-150 opacity-0 sm:group-hover:opacity-100 pointer-events-none sm:pointer-events-auto z-20"
                aria-label="Previous"
              >
                <PixelIcon name="arrow-left" className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] hover:bg-background transition-colors duration-150 opacity-0 sm:group-hover:opacity-100 pointer-events-none sm:pointer-events-auto z-20"
                aria-label="Next"
              >
                <PixelIcon name="arrow-right" className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Carousel dots */}
          {hasMultiple && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex(index);
                  }}
                  className={`w-2 h-2 sm:w-3 sm:h-3 border-2 border-text shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] transition-colors duration-150 ${
                    index === activeIndex
                      ? "bg-primary"
                      : "bg-white hover:bg-primary/20"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // Grid mode — thumbnails that open lightbox
  return (
    <>
      <MediaLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        items={items}
        currentIndex={activeIndex}
        onNavigate={(i) => setActiveIndex(i)}
      />

      <div className={`grid gap-3 ${className}`}>
        {/* Main image */}
        <div
          className="relative aspect-video cursor-pointer overflow-hidden border-4 border-text shadow-[4px_4px_0px_0px_rgba(65,44,71,1)]"
          onClick={() => openLightbox(0)}
        >
          {items[0].type === "image" ? (
            <img
              src={items[0].src}
              alt={items[0].alt || "Main image"}
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <video
              className="w-full h-full object-cover"
              src={items[0].src}
              muted
              playsInline
              preload="metadata"
            />
          )}
          {hasMultiple && (
            <div className="absolute bottom-3 right-3 bg-text/80 text-white px-3 py-1 text-sm font-ubuntu-mono font-bold border-2 border-white">
              1/{items.length}
            </div>
          )}
        </div>

        {/* Thumbnail grid */}
        {items.length > 1 && (
          <div className="grid grid-cols-3 gap-2">
            {items.slice(1, 4).map((item, index) => (
              <div
                key={index + 1}
                className="relative aspect-video cursor-pointer overflow-hidden border-3 border-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)]"
                onClick={() => openLightbox(index + 1)}
              >
                {item.type === "image" ? (
                  <img
                    src={item.src}
                    alt={item.alt || `Thumbnail ${index + 2}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-text/10">
                    <PixelIcon name="play" className="w-6 h-6 text-text/60" />
                  </div>
                )}
                {index === 2 && items.length > 4 && (
                  <div className="absolute inset-0 bg-text/80 flex items-center justify-center">
                    <span className="text-white text-2xl font-black-han-sans">
                      +{items.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {items.length > 4 && (
          <button
            onClick={() => openLightbox(0)}
            className="mt-2 px-4 py-2 border-3 border-text bg-white text-text font-ubuntu-mono font-bold shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] transition-all duration-200 hover:shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-primary/10"
          >
            View all ({items.length})
          </button>
        )}
      </div>
    </>
  );
}
