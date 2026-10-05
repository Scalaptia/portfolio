import { Toaster } from "sonner";
import "@/styles/toast.css";

export default function Toast() {
  return (
    <Toaster
      position="bottom-right"
      expand={false}
      richColors={false}
      closeButton={false}
      duration={3000}
      visibleToasts={1}
      className="toaster"
      gap={0}
      toastOptions={{
        unstyled: false,
        className: "toast-enhanced",
        style: {
          fontFamily: "Open Sans, sans-serif",
          fontWeight: "600",
          background: "linear-gradient(135deg, #ffffff 0%, #fafafa 100%)",
          color: "#412c47",
          border: "2px solid #412c47",
          borderRadius: "0px",
          boxShadow:
            "4px 4px 0px 0px rgba(65,44,71,1), inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 16px rgba(65,44,71,0.15)",
          padding: "14px 18px",
          fontSize: "14px",
          lineHeight: "1.4",
          letterSpacing: "0.2px",
        },
      }}
    />
  );
}
