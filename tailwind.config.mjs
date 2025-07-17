/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        primary: "#FD8D75",
        secondary: "#ADC7C6",
        text: "#412C47",
        background: "#FDF7E7",
      },
      fontFamily: {
        "ubuntu-mono": ["Ubuntu Mono", "monospace"],
        "black-han-sans": ["Black Han Sans", "sans-serif"],
        "open-sans": ["Open Sans", "sans-serif"],
      },
      backgroundImage: {
        noise: "url('/svg/noise.svg')",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      backgroundRepeat: {
        repeat: "repeat",
      },
      borderWidth: {
        3: "3px",
        5: "5px",
        6: "6px",
      },
      animation: {
        "toast-slide-in": "toast-slide-in 0.3s ease-out forwards",
        "toast-slide-up": "toast-slide-up 0.3s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
      },
      keyframes: {
        "toast-slide-in": {
          "0%": {
            transform: "translateX(100%)",
            opacity: "0",
          },
          "100%": {
            transform: "translateX(0)",
            opacity: "1",
          },
        },
        "toast-slide-up": {
          "0%": {
            transform: "translateY(100%)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
    },
    variants: {},
    plugins: [],
  },
};
