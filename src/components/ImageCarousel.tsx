import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { ImageModal } from "./ImageModal";

interface ImageCarouselProps {
  images: string[];
  live?: string;
}

export function ImageCarousel({ images, live }: ImageCarouselProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {/* Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPrevious={(e) => {
          e?.stopPropagation();
          setActiveImageIndex(
            (prev) => (prev - 1 + images.length) % images.length,
          );
        }}
        onNext={(e) => {
          e?.stopPropagation();
          setActiveImageIndex((prev) => (prev + 1) % images.length);
        }}
        hasMultipleImages={images.length > 1}
      >
        <img
          src={images[activeImageIndex]}
          alt={`Project screenshot ${activeImageIndex + 1}`}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          onLoad={() => setIsLoading(false)}
          loading="lazy"
        />
      </ImageModal>

      {/* Main carousel */}
      <div className="relative">
        {/* Images */}
        <div
          className="relative w-full aspect-video cursor-pointer bg-background/50 overflow-hidden transition-all duration-300 hover:shadow-[4px_4px_0px_0px_rgba(65,44,71,0.3)]"
          onClick={() => setIsModalOpen(true)}
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

          {/* Overlay gradient for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex(
                  (prev) => (prev - 1 + images.length) % images.length,
                );
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] hover:shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all duration-150 hover:bg-primary/10"
              aria-label="Previous image"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev + 1) % images.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] hover:shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all duration-150 hover:bg-primary/10"
              aria-label="Next image"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(index);
                }}
                className={`w-3 h-3 border-2 border-text shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] transition-colors ${
                  index === activeImageIndex ? "bg-primary" : "bg-white"
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
