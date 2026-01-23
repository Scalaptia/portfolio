import { ArrowLeft, ArrowRight, Maximize2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ImageModal } from "./ImageModal";

interface ImageCarouselProps {
  images: string[];
  live?: string;
}

export function ImageCarousel({ images, live }: ImageCarouselProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Preload adjacent images for better performance
  useEffect(() => {
    const preloadImage = (index: number) => {
      if (index >= 0 && index < images.length) {
        const img = new Image();
        img.src = images[index];
      }
    };

    // Preload previous and next images
    preloadImage(activeImageIndex - 1);
    preloadImage(activeImageIndex + 1);
  }, [activeImageIndex, images]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0); // Reset
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
    
    setIsDragging(false);
  };

  const handlePrevious = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <>
      {/* Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPrevious={handlePrevious}
        onNext={handleNext}
        images={images}
        currentImageIndex={activeImageIndex}
        onImageSelect={setActiveImageIndex}
      />

      {/* Main carousel */}
      <div className="relative group" ref={carouselRef}>
        {/* Images */}
        <div
          className="relative w-full aspect-video cursor-pointer bg-background/50 overflow-hidden transition-all duration-300 hover:shadow-[4px_4px_0px_0px_rgba(65,44,71,0.3)] touch-pan-y select-none"
          onClick={() => setIsModalOpen(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Project screenshot ${index + 1}`}
              className={`absolute top-0 left-0 w-full h-full object-cover transition-all duration-500 ease-in-out ${
                index === activeImageIndex
                  ? "opacity-100 z-10 scale-100"
                  : "opacity-0 z-0 scale-105"
              }`}
              draggable="false"
              loading="lazy"
              style={{
                backgroundColor: "transparent",
                backfaceVisibility: "hidden",
                transform:
                  index === activeImageIndex
                    ? "translateZ(0)"
                    : "translateZ(0) scale(1.05)",
                filter: index === activeImageIndex ? "none" : "blur(1px)",
              }}
            />
          ))}

          {/* Swipe hint for mobile (shows on first image) */}
          {images.length > 1 && activeImageIndex === 0 && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-text/70 text-xs font-ubuntu-mono bg-white/90 px-3 py-1 border border-text/30 sm:hidden pointer-events-none animate-pulse">
              ← Desliza →
            </div>
          )}

          {/* Overlay gradient for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        {/* Navigation Arrows - Desktop */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] hover:bg-background transition-colors duration-150 opacity-0 sm:group-hover:opacity-100 pointer-events-none sm:pointer-events-auto z-20"
              aria-label="Previous image"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] hover:bg-background transition-colors duration-150 opacity-0 sm:group-hover:opacity-100 pointer-events-none sm:pointer-events-auto z-20"
              aria-label="Next image"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(index);
                }}
                className={`w-2 h-2 sm:w-3 sm:h-3 border-2 border-text shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] transition-colors duration-150 ${
                  index === activeImageIndex
                    ? "bg-primary"
                    : "bg-white hover:bg-primary/20"
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
