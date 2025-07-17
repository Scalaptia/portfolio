import React from "react";
import { Download } from "lucide-react";

interface ResumeDownloadProps {
  text: string;
}

const ResumeDownload: React.FC<ResumeDownloadProps> = ({ text }) => {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = "/resume.pdf";
    link.download = "Resume_Fernando_Haro.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-background/80 backdrop-blur-sm border-4 border-text shadow-[8px_8px_0px_0px_rgba(65,44,71,1)] p-8 relative">
        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-6 h-6 border-r-4 border-b-4 border-text/30"></div>
        <div className="absolute bottom-0 right-0 w-6 h-6 border-l-4 border-t-4 border-text/30"></div>

        <div className="relative z-10 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-primary border-4 border-text shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-background" />
            </div>
            <h3 className="text-xl font-ubuntu-mono text-primary font-bold mb-2">
              Resume
            </h3>
            <p className="text-text font-open-sans text-sm">
              Download my complete resume with detailed experience and skills.
            </p>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-primary text-background px-6 py-3 font-ubuntu-mono font-bold border-2 border-text shadow-[4px_4px_0px_0px_rgba(65,44,71,1)] transition-all duration-150 hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(65,44,71,1)] mx-auto"
          >
            <Download className="w-4 h-4" />
            {text}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeDownload;
