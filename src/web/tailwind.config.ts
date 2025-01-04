import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms' // v0.5.x
import typography from '@tailwindcss/typography' // v0.5.x
import containerQueries from '@tailwindcss/container-queries' // v0.1.x

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{mdx,md}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D3748',
          hover: '#1A202C',
          focus: '#4A5568',
          light: '#4A5568',
          dark: '#1A202C'
        },
        secondary: {
          DEFAULT: '#4A5568',
          hover: '#2D3748',
          focus: '#718096'
        },
        accent: {
          DEFAULT: '#3182CE',
          hover: '#2C5282',
          focus: '#4299E1'
        },
        error: {
          DEFAULT: '#E53E3E',
          hover: '#C53030',
          focus: '#F56565'
        },
        success: {
          DEFAULT: '#38A169',
          hover: '#2F855A',
          focus: '#48BB78'
        },
        warning: {
          DEFAULT: '#ECC94B',
          hover: '#D69E2E',
          focus: '#F6E05E'
        },
        background: {
          light: '#FFFFFF',
          dark: '#1A202C'
        }
      },
      fontFamily: {
        primary: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        secondary: ['Lora', 'Georgia', 'serif']
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg': ['18px', '28px'],
        'xl': ['20px', '32px'],
        '2xl': ['24px', '36px'],
        '3xl': ['30px', '40px'],
        '4xl': ['36px', '44px'],
        '5xl': ['40px', '48px']
      },
      spacing: {
        'base': '4px',
        'grid': '8px',
        'gutter': '16px',
        'large': '24px',
        'xl': '32px'
      },
      screens: {
        'mobile': '320px',
        'tablet': '768px',
        'desktop': '1024px',
        'wide': '1440px'
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          mobile: '1rem',
          tablet: '2rem',
          desktop: '3rem',
          wide: '4rem'
        },
        screens: {
          mobile: '100%',
          tablet: '768px',
          desktop: '1024px',
          wide: '1280px'
        }
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'focus': '0 0 0 2px rgba(49, 130, 206, 0.2)'
      },
      borderRadius: {
        DEFAULT: '4px',
        'sm': '2px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px'
      },
      transitionDuration: {
        DEFAULT: '200ms'
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-in-out'
      }
    }
  },
  plugins: [
    forms({
      strategy: 'class'
    }),
    typography({
      className: 'prose'
    }),
    containerQueries
  ],
  darkMode: 'media',
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true
  },
  experimental: {
    optimizeUniversalDefaults: true
  },
  variants: {
    extend: {
      opacity: ['disabled'],
      cursor: ['disabled'],
      backgroundColor: ['active', 'disabled'],
      textColor: ['active', 'disabled'],
      ringColor: ['focus-visible'],
      ringWidth: ['focus-visible']
    }
  }
}

export default config