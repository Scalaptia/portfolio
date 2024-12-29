import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { ImageModal } from './ImageModal';

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
                    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
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
                />
            </ImageModal>

            {/* Main carousel */}
            <div className="relative">
                {/* Images */}
                <div 
                    className="relative w-full aspect-video cursor-pointer border-2 border-text"
                    onClick={() => setIsModalOpen(true)}
                >
                    {images.map((image, index) => (
                        <img
                            key={index}
                            src={image}
                            alt={`Project screenshot ${index + 1}`}
                            className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 ${
                                index === activeImageIndex ? 'opacity-100' : 'opacity-0'
                            }`}
                            draggable="false"
                        />
                    ))}
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)]"
                            aria-label="Previous image"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIndex((prev) => (prev + 1) % images.length);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 border-2 border-text bg-white text-text shadow-[2px_2px_0px_0px_rgba(65,44,71,1)]"
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
                                className={`w-3 h-3 border-2 border-text transition-colors ${
                                    index === activeImageIndex ? 'bg-primary' : 'bg-white'
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