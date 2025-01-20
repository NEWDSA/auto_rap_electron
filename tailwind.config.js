/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  // 禁用预检样式，避免覆盖 Element Plus 的基础样式
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}

