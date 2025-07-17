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
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
          toast(copiedText, { id: "copy-toast" });
        } catch (err) {
          console.error("Fallback copy failed:", err);
          toast("Failed to copy to clipboard", { id: "copy-toast" });
        } finally {
          document.body.removeChild(textArea);
        }
      } else {
        // Use modern clipboard API
        await navigator.clipboard.writeText(text);
        toast(copiedText, { id: "copy-toast" });
      }
    } catch (error) {
      console.error("Copy failed:", error);
      toast("Failed to copy to clipboard", { id: "copy-toast" });
    }
  };

  return (
    <button
      className="flex justify-center items-center cursor-pointer transition-all duration-150 hover:scale-110 hover:text-primary"
      onClick={handleClick}
      title="Copy email to clipboard"
    >
      <Copy className="w-5 h-5" />
    </button>
  );
}
