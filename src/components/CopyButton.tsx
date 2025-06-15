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
    <>
      <div className="flex relative pb-[2px]">
        <button
          className="flex justify-center items-center cursor-pointer transition-all duration-150 hover:scale-110 hover:text-primary"
          onClick={handleClick}
        >
          <Copy className="w-5 h-5" />
        </button>
      </div>{" "}
      {/* Toast notification fijo en la pantalla */}
      <div
        className={`pointer-events-none fixed bottom-4 left-1/2 transform -translate-x-1/2 font-open-sans text-center bg-white text-text border-2 border-text p-3 shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] z-[1000] rounded-md transition-all duration-300 ease-in-out ${showPopup ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      >
        {copiedText}
      </div>
    </>
  );
}
