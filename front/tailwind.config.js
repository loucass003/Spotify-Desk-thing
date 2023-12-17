
const rem = (val) => `${val * 2}rem`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        sm: rem(0.6),
        base: rem(1),
        md: rem(0.8),
        lg: rem(1 + 0.25/2),
        xl: rem(1.25),
        '2xl': rem(1.563),
        '3xl': rem(1.953),
        '4xl': rem(2.441),
        '5xl': rem(3.052),
      }
    },
  },
  plugins: [],
}

