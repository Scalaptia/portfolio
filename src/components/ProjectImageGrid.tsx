import { useState } from "react";
import { ImageModal } from "./ImageModal";

interface ProjectImageGridProps {
  images: string[];
  projectTitle: string;
  live?: string;
}

export function ProjectImageGrid({
  images,
  projectTitle,
  live,
}: ProjectImageGridProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const openModal = (index: number) => {
    setActiveImageIndex(index);
    setIsModalOpen(true);
  };

  return (
    <>
      {" "}
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
        currentImageIndex={activeImageIndex}
        totalImages={images.length}
        onImageSelect={(index) => setActiveImageIndex(index)}
      >
        <img
          src={images[activeImageIndex]}
          alt={`${projectTitle} screenshot ${activeImageIndex + 1}`}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          loading="lazy"
        />
      </ImageModal>
      {/* Image Grid */}
      <div className="grid gap-3">
        {/* Main image - takes full width */}
        <div
          className="relative aspect-video cursor-pointer overflow-hidden border-4 border-text shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] transition-all duration-300 hover:shadow-[6px_6px_0px_0px_rgba(65,44,71,1)] hover:-translate-x-[2px] hover:-translate-y-[2px]"
          onClick={() => openModal(0)}
        >
          <img
            src={images[0]}
            alt={`${projectTitle} main screenshot`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
          {/* Image counter overlay */}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-text/80 text-white px-3 py-1 text-sm font-ubuntu-mono font-bold border-2 border-white">
              1/{images.length}
            </div>
          )}
        </div>

        {/* Additional images - if more than 1 */}
        {images.length > 1 && (
          <div className="grid grid-cols-3 gap-2">
            {images.slice(1, 4).map((image, index) => (
              <div
                key={index + 1}
                className="relative aspect-video cursor-pointer overflow-hidden border-3 border-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] transition-all duration-300 hover:shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] hover:-translate-x-[1px] hover:-translate-y-[1px]"
                onClick={() => openModal(index + 1)}
              >
                <img
                  src={image}
                  alt={`${projectTitle} screenshot ${index + 2}`}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>

                {/* Show "+" overlay if this is the 3rd thumbnail and there are more images */}
                {index === 2 && images.length > 4 && (
                  <div className="absolute inset-0 bg-text/80 flex items-center justify-center">
                    <span className="text-white text-2xl font-black-han-sans">
                      +{images.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* View all button for projects with many images */}
        {images.length > 4 && (
          <button
            onClick={() => openModal(0)}
            className="mt-2 px-4 py-2 border-3 border-text bg-white text-text font-ubuntu-mono font-bold shadow-[3px_3px_0px_0px_rgba(65,44,71,1)] transition-all duration-200 hover:shadow-[1px_1px_0px_0px_rgba(65,44,71,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-primary/10"
          >
            Ver todas las imágenes ({images.length})
          </button>
        )}
      </div>
    </>
  );
}
