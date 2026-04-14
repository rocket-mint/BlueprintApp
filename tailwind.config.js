/** @type {import('tailwindcss').Config} */
// Tokens mirrored from Figma file 9Oh1eOXsRmMLgSVyrkjgsR (AppFolio Style Guide)
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          "navy-1000": "#001a4d",
          "navy-900": "#0a2540",
          "navy-700": "#13315c",
          "navy-500": "#1e4976",
          "cyan-500": "#00b0ca",
          "cyan-400": "#1fc4dc",
          "cyan-300": "#5fd8e8",
          "blue-700": "#006dbf",
          "blue-500": "#0f97ff",
          "blue-300": "#7accff",
          "blue-100": "#cde9f9",
          "blue-50":  "#f3faff",
          "purple-500": "#8073ff",
          "purple-300": "#baaaff",
        },
        neutral: {
          white: "#ffffff",
          "gray-50":  "#f7f9fc",
          "gray-100": "#eef2f7",
          "gray-200": "#d6dae0",
          "gray-300": "#c1c7d0",
          "gray-500": "#7a8699",
          "gray-600": "#465670",
          "gray-700": "#3d4a5c",
          "gray-900": "#0f1724",
          "sand-50":  "#f0f0eb",
        },
        semantic: {
          success: "#2bb673",
          warning: "#f5a623",
          error:   "#e5484d",
          info:    "#00b0ca",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        none: "0px",
        sm:   "4px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
