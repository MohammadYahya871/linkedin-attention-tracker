/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/ui/**/*.{html,ts,css}",
    "./src/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        linkedin: {
          blue: '#0A66C2',
          'blue-dark': '#004182',
          'blue-light': '#378fe9',
          gray: '#f3f2ef',
          'gray-dark': '#e5e4e0'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
