import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f0e17',
        accent: '#f00069',
        teal: '#1f8c9b',
        light: '#e7efef',
        cream: '#fffffe',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'rgb(15 14 23 / 0.8)',
            a: {
              color: '#1f8c9b',
              textDecoration: 'underline',
              '&:hover': {
                color: '#1f8c9b',
                opacity: '0.8',
              },
            },
            img: {
              borderRadius: '0.75rem',
              marginTop: '2em',
              marginBottom: '2em',
            },
            'figure img': {
              marginTop: '0',
              marginBottom: '0',
            },
            figcaption: {
              textAlign: 'center',
              fontStyle: 'italic',
            },
            'h1, h2, h3, h4': {
              color: '#0f0e17',
            },
            blockquote: {
              borderLeftColor: '#1f8c9b',
              color: 'rgb(15 14 23 / 0.7)',
            },
            '.wp-block-image': {
              marginTop: '2em',
              marginBottom: '2em',
            },
            '.wp-block-image img': {
              borderRadius: '0.75rem',
              width: '100%',
            },
            '.wp-block-gallery': {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1rem',
            },
            '.wp-block-embed': {
              marginTop: '2em',
              marginBottom: '2em',
            },
            '.wp-block-embed iframe': {
              width: '100%',
              borderRadius: '0.75rem',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
