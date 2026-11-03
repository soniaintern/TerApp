/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#0B5CFF',
        'primary-dark': '#0948CC',
        secondary: '#FF6B35',
        accent: '#2E86AB',
        background: '#F5F7FA',
        'background-dark': '#1A1D21',
        surface: '#FFFFFF',
        'surface-dark': '#272A30',
        text: '#1A1D21',
        'text-dark': '#F5F7FA',
        'text-secondary': '#6B7280',
        'text-secondary-dark': '#9CA3AF',
        border: '#E5E7EB',
        'border-dark': '#374151',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        danger: '#DC2626',
      },
    },
  },
  plugins: [],
};
