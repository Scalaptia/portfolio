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
}

export function ImageModal({
  isOpen,
  onClose,
  children,
  onPrevious,
  onNext,
  hasMultipleImages,
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
      className="fixed inset-0 bg-black/80 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute top-4 right-4 p-2 border-2 border-white bg-red-800 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        onClick={onClose}
        aria-label="Close modal"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full h-full flex items-center justify-center p-4">
        <div
          className="border-y-8 border-x-4 border-background bg-slate-800 p-2 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {children}

          {hasMultipleImages && (
            <>
              <button
                onClick={onPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)]"
                aria-label="Previous image"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)]"
                aria-label="Next image"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
