import { useState } from "react";

interface props {
    text: string;
}

export default function copyToClipboard({ text }: props) {
    const [showPopup, setShowPopup] = useState(false);

    const handleClick = async () => {
        await navigator.clipboard.writeText(text);
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 1500);
    };

    return (
        <div className="flex relative pb-[2px]">
            <button
                className="flex justify-center items-center cursor-pointer"
                onClick={handleClick}
            >
                <img
                    className="pointer-events-none"
                    src="copy.svg"
                    alt="copy"
                    draggable="false"
                />
            </button>
            {showPopup ? (
                <div className="pointer-events-none absolute font-open-sans rounded-lg text-center -top-10 -left-32 md:left-0 bg-white text-text p-2 z-10 w-[19ch] transition duration-100 ease-in-out opacity-100">
                    Copied to clipboard!
                </div>
            ) : (
                <div className="pointer-events-none absolute font-open-sans rounded-lg text-center -top-10 -left-32 md:left-0 bg-white text-text p-2 z-10 w-[19ch] transition duration-100 ease-in-out opacity-0">
                    Copied to clipboard!
                </div>
            )}
        </div>
    );
}
