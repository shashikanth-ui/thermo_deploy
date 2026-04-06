/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF4FF',
          100: '#D6E4FF',
          600: '#0B5FFF'
        },
        success: '#0E9384',
        warning: '#F79009',
        border: '#E6EAF0',
        text: {
          primary: '#101828',
          secondary: '#475467',
          muted: '#667085'
        }
      },
      borderRadius: {
        card: '14px'
      },
      boxShadow: {
        card: '0 6px 20px rgba(16, 24, 40, 0.06)'
      }
    }
  },
  plugins: []
}
