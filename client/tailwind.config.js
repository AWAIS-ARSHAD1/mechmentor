/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { 
    extend: { 
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: { 'spin-slow': 'spin 5s linear infinite' }
    } 
  },
  plugins: [],
}
