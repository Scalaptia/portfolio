import { X, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentImageIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onImageSelect: (index: number) => void;
}

export function ImageModal({
  isOpen,
  onClose,
  images,
  currentImageIndex,
  onPrevious,
  onNext,
  onImageSelect,
}: ModalProps) {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [imageTransition, setImageTransition] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 75;
  const hasMultipleImages = images.length > 1;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (hasMultipleImages) onPrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (hasMultipleImages) onNext();
          break;
        case "Home":
          e.preventDefault();
          if (hasMultipleImages) onImageSelect(0);
          break;
        case "End":
          e.preventDefault();
          if (hasMultipleImages) onImageSelect(images.length - 1);
          break;
        default:
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      // Prevent pinch zoom on mobile
      document.body.style.touchAction = "none";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
    };
  }, [isOpen, onClose, onPrevious, onNext, hasMultipleImages, images.length, onImageSelect]);

  // Preload adjacent images
  useEffect(() => {
    if (!isOpen) return;

    const preloadImage = (index: number) => {
      if (index >= 0 && index < images.length) {
        const img = new Image();
        img.src = images[index];
      }
    };

    preloadImage(currentImageIndex - 1);
    preloadImage(currentImageIndex + 1);
  }, [currentImageIndex, images, isOpen]);

  // Touch/Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !hasMultipleImages) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setImageTransition(true);
      onNext();
      setTimeout(() => setImageTransition(false), 300);
    } else if (isRightSwipe) {
      setImageTransition(true);
      onPrevious();
      setTimeout(() => setImageTransition(false), 300);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 z-50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery modal"
    >
      {/* Close button */}
      <button
        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-3 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] sm:shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] hover:shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] sm:hover:shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] transition-all duration-150 hover:bg-gray-50 z-50"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close modal (press Escape)"
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <div 
        className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 gap-4 sm:gap-6 animate-in fade-in zoom-in-95 duration-200"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image container with border */}
        <div
          ref={imageContainerRef}
          className="border-2 sm:border-4 border-text bg-background shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] sm:shadow-[6px_6px_0px_0px_rgba(65,44,71,1)] relative p-2 sm:p-3 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative corner elements */}
          <div className="absolute top-0 left-0 w-4 h-4 sm:w-6 sm:h-6 border-r-4 border-b-4 border-text/30"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-6 sm:h-6 border-l-4 border-t-4 border-text/30"></div>

          {/* Main image with fade transition */}
          <div className="relative flex items-center justify-center bg-black overflow-hidden">
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Project screenshot ${index + 1}`}
                className={`max-h-[70vh] max-w-[85vw] sm:max-h-[75vh] sm:max-w-[85vw] object-contain transition-opacity duration-300 block ${
                  index === currentImageIndex ? "opacity-100 relative" : "opacity-0 absolute pointer-events-none"
                }`}
                draggable="false"
                style={{ display: 'block' }}
              />
            ))}
          </div>

          {/* Navigation arrows - Desktop only */}
          {hasMultipleImages && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevious();
                }}
                className="hidden sm:flex absolute left-[-80px] top-1/2 -translate-y-1/2 p-3 border-2 border-text bg-white text-text shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] hover:bg-background transition-colors duration-150 items-center justify-center z-50"
                aria-label="Previous image (press left arrow)"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="hidden sm:flex absolute right-[-80px] top-1/2 -translate-y-1/2 p-3 border-2 border-text bg-white text-text shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] hover:bg-background transition-colors duration-150 items-center justify-center z-50"
                aria-label="Next image (press right arrow)"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Dot indicators outside container */}
        {hasMultipleImages && (
          <div className="flex gap-2 sm:gap-3">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  onImageSelect(index);
                }}
                className={`w-3 h-3 sm:w-4 sm:h-4 border-2 border-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] transition-colors duration-150 flex-shrink-0 ${
                  index === currentImageIndex
                    ? "bg-primary"
                    : "bg-white hover:bg-primary/20"
                }`}
                aria-label={`Go to image ${index + 1}`}
                aria-current={index === currentImageIndex ? "true" : "false"}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
