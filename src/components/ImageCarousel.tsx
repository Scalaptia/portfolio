import React, { useState, useEffect } from 'react';

interface ImageCarouselProps {
    images: string[];
    interval: number;
    live?: string;
}

export function ImageCarousel({ images, interval, live }: ImageCarouselProps) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveImageIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, interval);

        return () => {
            clearInterval(timer);
        };
    }, [images, interval]);

    return (
        <>
        <div className="relative w-full h-[200px] sm:h-[332px]">
        {images.map((image, index) => (
            <img
                key={index}
                src={image}
                alt={`content ${index}`}
                className={`absolute top-0 left-0 w-full h-full first-letter:object-cover transition-opacity duration-1000 ease-in-out ${
                    index === activeImageIndex ? 'opacity-100' : 'opacity-0'
                } ${live && index === activeImageIndex ? 'group-hover:opacity-50 group-hover:duration-200' : ''}`}
                draggable="false"
            />
        ))}
        </div>
        {live && (
            <a
                href={live}
                target="_blank"
                className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100"
            >
                <span className="flex gap-3 items-center text-white text-3xl select-none font-extrabold font-ubuntu-mono">
                    Live Demo{" "}
                    <img
                        src="/svg/arrow-up-right-from-square.svg"
                        draggable="false"
                        className="w-7 h-7"
                    />
                </span>
            </a>
        )}
        </>
    );
}