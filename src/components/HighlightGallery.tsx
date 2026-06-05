import { useState, useCallback } from "react";
import { MediaLightbox } from "./MediaLightbox";

interface Highlight {
  photo: string;
  title: string;
  event: string;
  description?: string;
  period: string;
}

interface HighlightGalleryProps {
  highlights: Highlight[];
}

export function HighlightGallery({ highlights }: HighlightGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const items = highlights.map((h) => ({
    type: "image" as const,
    src: h.photo,
    alt: h.event,
    caption: h.period,
    description: h.description || `${h.title} — ${h.event}`,
  }));

  const open = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  return (
    <>
      <MediaLightbox
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={items}
        currentIndex={currentIndex}
        onNavigate={setCurrentIndex}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full">
        {highlights.map((h, i) => (
          <button
            key={i}
            className="group border-2 sm:border-4 border-text shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] sm:shadow-[6px_6px_0px_0px_rgba(65,44,71,1)] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] hover:translate-x-[2px] hover:translate-y-[2px] text-left bg-background"
            onClick={() => open(i)}
            aria-label={`Open ${h.title} - ${h.event}`}
          >
            <div className="aspect-[4/3] sm:aspect-[3/2] overflow-hidden">
              <img
                src={h.photo}
                alt={h.event}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading={i < 2 ? "eager" : "lazy"}
                draggable="false"
              />
            </div>
            <div className="p-3 sm:p-4">
              <span className="text-text/50 font-ubuntu-mono text-xs">{h.period}</span>
              <h3 className="text-text font-black-han-sans text-sm sm:text-base leading-tight mt-0.5">{h.title}</h3>
              <span className="text-primary font-ubuntu-mono text-xs font-semibold">{h.event}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
