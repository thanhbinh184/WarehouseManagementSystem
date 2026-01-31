/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        // Thêm màu 'brand' (dùng Indigo làm mặc định để khớp với code cũ của bạn)
        colors: {
          brand: {
            50: '#eef2ff',
            100: '#e0e7ff',
            200: '#c7d2fe',
            300: '#a5b4fc',
            400: '#818cf8',
            500: '#6366f1',
            600: '#4f46e5', // Màu chính thường dùng
            700: '#4338ca',
            800: '#3730a3',
            900: '#312e81',
          },
        },
        // Thêm các animation bạn đã dùng trong code
        animation: {
          'fade-in': 'fadeIn 0.5s ease-out',
          'fade-in-up': 'fadeInUp 0.5s ease-out',
          'fade-in-left': 'fadeInLeft 0.5s ease-out',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          fadeInUp: {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          fadeInLeft: {
            '0%': { opacity: '0', transform: 'translateX(20px)' },
            '100%': { opacity: '1', transform: 'translateX(0)' },
          },
        },
      },
    },
    plugins: [],
  } 