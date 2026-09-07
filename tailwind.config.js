/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        resident: {
          primary: '#6366f1',   // Indigo 500
          secondary: '#f43f5e', // Rose 500
          background: '#EEF2FF', // Luxury Blue Base
        },
        responder: {
          primary: '#dc2626',   // Red 600
          background: '#ffffff', // Pure White
          surface: '#f3f4f6',    // Gray 100 for cards/borders
        }
      }
    },
  },
  plugins: [],
};