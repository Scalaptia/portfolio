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
      },
      backgroundRepeat: {
        repeat: "repeat",
      },
    },
    variants: {},
    plugins: [],
  },
};
