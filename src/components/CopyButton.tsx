import { useState } from "react";
import { Copy } from "lucide-react";

interface CopyToClipboardProps {
    text: string;
    copiedText: string;
}

export default function CopyToClipboard({ text, copiedText }: CopyToClipboardProps) {
    const [showPopup, setShowPopup] = useState(false);

    const handleClick = async () => {
        await navigator.clipboard.writeText(text);
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 1500);
    };

    return (
        <div className="flex relative pb-[2px]">
            <button
                className="flex justify-center items-center cursor-pointer transition-opacity duration-150 hover:opacity-80"
                onClick={handleClick}
            >
                <Copy className="w-5 h-5" />
            </button>
            <div className={`pointer-events-none absolute font-open-sans text-center -top-10 -left-32 md:left-0 bg-white text-text border-2 border-text p-2 z-10 inline-block w-auto transition duration-100 ease-in-out whitespace-nowrap overflow-hidden text-overflow-ellipsis ${showPopup ? 'opacity-100' : 'opacity-0'}`}>
                {copiedText}
            </div>
        </div>
    );
}