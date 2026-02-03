import { Copy } from "lucide-react";
import { toast } from "sonner";

interface CopyToClipboardProps {
  text: string;
  copiedText: string;
}

export default function CopyToClipboard({
  text,
  copiedText,
}: CopyToClipboardProps) {
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast(copiedText, { id: "copy-toast" });
      // Trigger email copied event for PC cat reaction
      window.dispatchEvent(new CustomEvent('emailCopied'));
    } catch (error) {
      toast("Failed to copy to clipboard", { id: "copy-toast" });
    }
  };

  return (
    <button
      className="flex justify-center items-center cursor-pointer"
      onClick={handleClick}
    >
      <Copy className="w-5 h-5" />
    </button>
  );
}
