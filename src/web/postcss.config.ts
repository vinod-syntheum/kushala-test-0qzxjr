// postcss v8.4.0
import type { Config } from 'postcss'
// tailwindcss v3.3.0
import tailwindcss from 'tailwindcss'
// autoprefixer v10.4.0
import autoprefixer from 'autoprefixer'

const config: Config = {
  plugins: [
    // Process Tailwind CSS utilities and directives
    tailwindcss({
      config: './tailwind.config.ts',
      // Enable important modifier for utility classes
      important: true,
      // Enable dark mode with class strategy
      darkMode: 'class'
    }),
    // Add vendor prefixes for cross-browser compatibility
    autoprefixer({
      flexbox: 'no-2009',
      grid: 'autoplace',
      // Browser compatibility settings
      browsers: [
        '> 1%',
        'last 2 versions',
        'not dead'
      ]
    })
  ],
  // Environment-specific configuration
  ...(process.env.NODE_ENV === 'development' 
    ? {
        // Development settings
        sourceMap: true,
        debug: true,
        // Enable parallel processing in development
        processOptions: {
          parallel: true,
          cache: true
        }
      }
    : {
        // Production settings
        sourceMap: false,
        // Enable minification in production
        minimize: true,
        processOptions: {
          parallel: true,
          cache: true
        }
      }
  )
}

export default config