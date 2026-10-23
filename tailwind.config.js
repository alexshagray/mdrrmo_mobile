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
        primary: {
          DEFAULT: '#208AEF',
          50: '#F0F7FF',
          100: '#E0EFFF',
          200: '#BAE0FD',
          500: '#3B9CF8',
          600: '#208AEF',
          700: '#1570C7',
        },
        secondary: {
          DEFAULT: '#FF3B30',
          50: '#FFF1F0',
          100: '#FFE1DF',
          200: '#FFBCB8',
          500: '#FF5E55',
          600: '#FF3B30',
          700: '#D7261B',
        },
        opol: {
          blue: '#208AEF',
          red: '#FF3B30',
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#94A3B8',
          text: '#1E293B',
          subtext: '#64748B',
        },
        resident: {
          primary: '#208AEF',   // Official OPOL RESQ Blue
          secondary: '#FF3B30', // Official OPOL RESQ Red
          background: '#F8FAFC', // Neutral clean background
        },
        responder: {
          primary: '#FF3B30',   // Emergency Red for responder actions
          accent: '#208AEF',    // Brand Blue accent
          background: '#F8FAFC',
          surface: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
};