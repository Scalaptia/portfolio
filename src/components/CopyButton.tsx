import { useState } from "react";
import { Copy } from "lucide-react";

interface CopyToClipboardProps {
  text: string;
  copiedText: string;
}

export default function CopyToClipboard({
  text,
  copiedText,
}: CopyToClipboardProps) {
  const [showPopup, setShowPopup] = useState(false);

  const handleClick = async () => {
    await navigator.clipboard.writeText(text);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 1500);
  };
  return (
    <div className="flex relative pb-[2px]">
      <button
        className="flex justify-center items-center cursor-pointer transition-all duration-150 hover:scale-110 hover:text-primary"
        onClick={handleClick}
      >
        <Copy className="w-5 h-5" />
      </button>
      {/* Mensaje de copiado posicionado relativo al botón */}
      <div
        className={`pointer-events-none absolute font-open-sans text-center bg-white text-text border-2 border-text p-2 shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] z-[100] inline-block w-auto transition-all duration-200 ease-in-out whitespace-nowrap -top-12 left-1/2 transform -translate-x-1/2 ${showPopup ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      >
        {copiedText}
        {/* Flecha apuntando al botón */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-text"></div>
      </div>
    </div>
  );
}
