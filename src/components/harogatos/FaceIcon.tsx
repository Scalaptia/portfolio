import { useEffect, useRef } from "react";
import { drawFromArt, createFaceCanvas } from "@/components/pc-model/drawing";
import type { ColorScheme } from "@/components/pc-model/faces";

interface FaceIconProps {
  art: string[];
  color: ColorScheme;
  accent?: string;
  className?: string;
}

// The PC's face, drawn flat on the page. drawFromArt paints mirrored because the 3D screen's UVs
// flip it back; nothing flips a plain canvas, so this one is turned round with CSS.
export default function FaceIcon({ art, color, accent, className }: FaceIconProps) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!holder.current) return;
    if (!canvas.current) {
      canvas.current = createFaceCanvas(256);
      canvas.current.className = "w-full h-full block";
      canvas.current.style.transform = "scaleX(-1)";
      holder.current.appendChild(canvas.current);
    }
    const ctx = canvas.current.getContext("2d");
    if (ctx) drawFromArt(ctx, art, color, accent);
  }, [art, color, accent]);

  return <div ref={holder} className={className} aria-hidden="true" />;
}
