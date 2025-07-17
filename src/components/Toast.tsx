import { Toaster } from "sonner";

export default function Toast() {
  return (
    <>
      <style>
        {`
          /* Toast animations with smooth easing */
          @keyframes toast-slide-in {
            0% {
              opacity: 0;
              transform: translateX(100%) scale(0.95);
              filter: blur(2px);
            }
            50% {
              opacity: 0.8;
              filter: blur(1px);
            }
            100% {
              opacity: 1;
              transform: translateX(0%) scale(1);
              filter: blur(0px);
            }
          }
          
          @keyframes toast-slide-out {
            0% {
              opacity: 1;
              transform: translateX(0%) scale(1);
              filter: blur(0px);
            }
            50% {
              opacity: 0.6;
              filter: blur(1px);
            }
            100% {
              opacity: 0;
              transform: translateX(100%) scale(0.95);
              filter: blur(2px);
            }
          }

          /* Mobile animations with bounce effect */
          @keyframes toast-slide-in-mobile {
            0% {
              opacity: 0;
              transform: translateY(100%) scale(0.9);
            }
            60% {
              opacity: 0.9;
              transform: translateY(-8px) scale(1.02);
            }
            100% {
              opacity: 1;
              transform: translateY(0%) scale(1);
            }
          }
          
          @keyframes toast-slide-out-mobile {
            0% {
              opacity: 1;
              transform: translateY(0%) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateY(100%) scale(0.9);
            }
          }

          /* Subtle glow animation */
          @keyframes glow-pulse {
            0%, 100% {
              box-shadow: 4px 4px 0px 0px rgba(65,44,71,1), 0 0 0 0 rgba(139, 92, 246, 0);
            }
            50% {
              box-shadow: 4px 4px 0px 0px rgba(65,44,71,1), 0 0 12px 2px rgba(139, 92, 246, 0.1);
            }
          }

          /* Toaster container positioning */
          .toaster {
            position: fixed !important;
            z-index: 9999 !important;
            pointer-events: none !important;
          }

          /* Desktop positioning (bottom-right) */
          @media (min-width: 768px) {
            .toaster {
              bottom: 24px !important;
              right: 24px !important;
              left: auto !important;
              top: auto !important;
              transform: none !important;
            }
          }

          /* Mobile positioning (bottom-center) */
          @media (max-width: 767px) {
            .toaster {
              bottom: 24px !important;
              left: 50% !important;
              right: auto !important;
              top: auto !important;
              transform: translateX(-50%) !important;
              width: auto !important;
            }
          }

          /* Custom toast styling with enhanced visuals */
          [data-sonner-toast] {
            background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%) !important;
            color: #412c47 !important;
            border: 2px solid #412c47 !important;
            border-radius: 0px !important;
            box-shadow: 
              4px 4px 0px 0px rgba(65,44,71,1),
              inset 0 1px 0 rgba(255,255,255,0.9),
              0 8px 16px rgba(65,44,71,0.15) !important;
            font-family: "Open Sans", sans-serif !important;
            font-weight: 600 !important;
            font-size: 14px !important;
            padding: 14px 18px !important;
            transition: none !important;
            transform: none !important;
            pointer-events: auto !important;
            position: relative !important;
            overflow: hidden !important;
            margin: 0 auto !important;
          }

          /* Desktop toast sizing */
          @media (min-width: 768px) {
            [data-sonner-toast] {
              min-width: 280px !important;
              max-width: 320px !important;
              width: auto !important;
            }
          }

          /* Mobile toast sizing */
          @media (max-width: 767px) {
            [data-sonner-toast] {
              min-width: 260px !important;
              max-width: calc(100vw - 48px) !important;
              width: auto !important;
              margin-left: auto !important;
              margin-right: auto !important;
            }
          }

          /* Decorative corner elements */
          [data-sonner-toast]::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 8px;
            height: 8px;
            border-right: 2px solid rgba(65,44,71,0.3);
            border-bottom: 2px solid rgba(65,44,71,0.3);
          }

          [data-sonner-toast]::after {
            content: '';
            position: absolute;
            bottom: 0;
            right: 0;
            width: 8px;
            height: 8px;
            border-left: 2px solid rgba(65,44,71,0.3);
            border-top: 2px solid rgba(65,44,71,0.3);
          }

          /* Text styling improvements */
          [data-sonner-toast] div {
            line-height: 1.4 !important;
            letter-spacing: 0.2px !important;
            text-shadow: 0 1px 2px rgba(65,44,71,0.1) !important;
          }

          /* Desktop animations with enhanced effects */
          @media (min-width: 768px) {
            [data-sonner-toast] {
              animation: toast-slide-in 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards,
                         glow-pulse 2s ease-in-out infinite !important;
            }
            
            [data-sonner-toast][data-removing="true"] {
              animation: toast-slide-out 0.3s cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards !important;
            }
          }

          /* Mobile animations with bounce */
          @media (max-width: 767px) {
            [data-sonner-toast] {
              animation: toast-slide-in-mobile 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
            }
            
            [data-sonner-toast][data-removing="true"] {
              animation: toast-slide-out-mobile 0.3s ease-in forwards !important;
            }
          }

          /* Remove all hover effects and ensure consistency */
          [data-sonner-toast]:hover {
            background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%) !important;
            color: #412c47 !important;
            border: 2px solid #412c47 !important;
            box-shadow: 
              4px 4px 0px 0px rgba(65,44,71,1),
              inset 0 1px 0 rgba(255,255,255,0.9),
              0 8px 16px rgba(65,44,71,0.15) !important;
            transform: none !important;
            scale: 1 !important;
          }

          /* Override all sonner variants with consistent styling */
          [data-sonner-toast][data-type="success"],
          [data-sonner-toast][data-type="error"],
          [data-sonner-toast][data-type="info"],
          [data-sonner-toast][data-type="warning"] {
            background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%) !important;
            color: #412c47 !important;
            border: 2px solid #412c47 !important;
          }

          /* Remove close button and icons */
          [data-sonner-toast] button,
          [data-sonner-toast] [data-icon],
          [data-sonner-toast] svg {
            display: none !important;
          }

          /* Subtle backdrop blur effect for better contrast */
          .toaster::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: -1;
          }

          /* Enhanced focus states for accessibility */
          [data-sonner-toast]:focus-visible {
            outline: 2px solid #8b5cf6;
            outline-offset: 2px;
          }

          /* Progress bar styling (if enabled) */
          [data-sonner-toast] [data-progress] {
            background-color: rgba(65,44,71,0.2) !important;
            height: 2px !important;
          }
        `}
      </style>
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
    </>
  );
}
