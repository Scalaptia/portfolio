import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  onPrevious?: (e?: React.MouseEvent) => void;
  onNext?: (e?: React.MouseEvent) => void;
  hasMultipleImages?: boolean;
  currentImageIndex?: number;
  totalImages?: number;
  onImageSelect?: (index: number) => void;
}

export function ImageModal({
  isOpen,
  onClose,
  children,
  onPrevious,
  onNext,
  hasMultipleImages,
  currentImageIndex = 0,
  totalImages = 1,
  onImageSelect,
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/85 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute top-4 right-4 p-2 border-2 border-text bg-white text-text shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] hover:shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] transition-all duration-150 hover:bg-gray-50 z-10"
        onClick={onClose}
        aria-label="Close modal"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="w-full h-full flex items-center justify-center p-4">
        <div
          className="border-4 border-text bg-background shadow-[6px_6px_0px_0px_rgba(65,44,71,1)] relative max-w-[95vw] max-h-[95vh] p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {children}

          {hasMultipleImages && (
            <>
              <button
                onClick={onPrevious}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] hover:shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] transition-all duration-150 hover:bg-primary/10"
                aria-label="Previous image"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={onNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] hover:shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] transition-all duration-150 hover:bg-primary/10"
                aria-label="Next image"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Indicators for modal */}
          {hasMultipleImages && totalImages > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {Array.from({ length: totalImages }, (_, index) => (
                <button
                  key={index}
                  onClick={() => onImageSelect?.(index)}
                  className={`w-3 h-3 border-2 border-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] transition-all duration-150 hover:scale-105 ${
                    index === currentImageIndex
                      ? "bg-primary"
                      : "bg-white hover:bg-primary/20"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
