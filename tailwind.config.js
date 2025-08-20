/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Orange (from logo) - Split-complementary harmony
        'brand-orange': {
          50: '#FFF4ED',
          100: '#FFE4CC',
          200: '#FFC599',
          300: '#FF9F66',
          400: '#FF7A33',
          500: '#FF6B35', // Logo match
          600: '#E55B2B',
          700: '#CC4C22',
          800: '#B23E1A',
          900: '#993312',
        },
        // Professional Slate (replaces blue theme)
        'brand-slate': {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        // Coral accent colors for loading system
        'coral': {
          50: '#FFF5F5',
          100: '#FED7D7',
          200: '#FEB2B2',
          300: '#FC8181',
          400: '#F87171', // Primary coral color from spec
          500: '#F56565',
          600: '#E53E3E',
          700: '#C53030',
          800: '#9B2C2C',
          900: '#742A2A',
        }
      },
      animation: {
        'gradient': 'gradient 15s ease infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'logo-entrance': 'logoEntrance 1.2s ease-out',
        'logo-glow': 'logoGlow 2s ease-in-out 0.5s infinite alternate',
        // Simple spinning circle loader
        'spin-smooth': 'spinSmooth 1s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glow: {
          '0%': { 'box-shadow': '0 0 20px rgba(59, 130, 246, 0.3)' },
          '100%': { 'box-shadow': '0 0 30px rgba(59, 130, 246, 0.6)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        logoEntrance: {
          '0%': { 
            transform: 'translateY(-10px) scale(0.9)', 
            opacity: '0' 
          },
          '50%': { 
            transform: 'translateY(0) scale(1.05)', 
            opacity: '0.8' 
          },
          '100%': { 
            transform: 'translateY(0) scale(1)', 
            opacity: '1' 
          },
        },
        logoGlow: {
          '0%': { 
            opacity: '0.3',
            transform: 'scale(1.2)' 
          },
          '100%': { 
            opacity: '0.6',
            transform: 'scale(1.5)' 
          },
        },
        // Simple spinning circle loader keyframes
        spinSmooth: {
          '0%': { 
            transform: 'rotate(0deg)'
          },
          '100%': { 
            transform: 'rotate(360deg)'
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}