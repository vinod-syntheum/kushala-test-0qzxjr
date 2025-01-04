// @ts-check
import { defineConfig } from 'cypress'; // ^13.0.0

export default defineConfig({
  // Global configuration
  baseUrl: 'http://localhost:3000',
  viewportWidth: 1280,
  viewportHeight: 720,
  defaultCommandTimeout: 10000,
  requestTimeout: 10000,
  responseTimeout: 30000,
  video: false,
  screenshotOnRunFailure: true,
  retries: {
    runMode: 2,
    openMode: 0,
  },

  // E2E Testing Configuration
  e2e: {
    specPattern: 'src/web/tests/e2e/**/*.cy.ts',
    supportFile: 'src/web/tests/support/e2e.ts',
    baseUrl: 'http://localhost:3000',
    experimentalSessionAndOrigin: true,
    chromeWebSecurity: false,
    testIsolation: true,
    watchForFileChanges: true,
    pageLoadTimeout: 30000,
    experimentalStudio: true,
    
    setupNodeEvents(on, config) {
      // Register test result reporters for CI/CD integration
      require('@cypress/code-coverage/task')(on, config);
      
      // Configure environment-specific variables
      config.env = {
        ...config.env,
        apiUrl: process.env.API_URL || 'http://localhost:4000/api/v1',
      };

      // Database cleaning hooks
      on('task', {
        async cleanDatabase() {
          // Add database cleanup logic here
          return null;
        },
      });

      // Browser launch options
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--no-sandbox');
        }
        return launchOptions;
      });

      // Test retry mechanism
      on('test:after:run', (results) => {
        if (results.state === 'failed' && results.currentRetry < config.retries.runMode) {
          return true;
        }
      });

      // Screenshot and video capture rules
      on('after:screenshot', (details) => {
        return details;
      });

      return config;
    },
  },

  // Component Testing Configuration
  component: {
    specPattern: 'src/web/tests/component/**/*.cy.ts',
    supportFile: 'src/web/tests/support/component.ts',
    devServer: {
      framework: 'next',
      bundler: 'webpack',
      webpackConfig: {
        mode: 'development',
        devtool: 'eval-source-map',
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
        module: {
          rules: [
            {
              test: /\.(ts|tsx)$/,
              exclude: /node_modules/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
                },
              },
            },
          ],
        },
      },
    },
  },

  // Environment Variables and Feature Flags
  env: {
    apiUrl: 'http://localhost:4000/api/v1',
    coverage: false,
    codeCoverage: {
      url: 'http://localhost:4000/__coverage__',
      threshold: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
    experimentalFeatures: {
      websiteBuilder: true,
      eventManagement: true,
      locationManagement: true,
    },
  },

  // Project Settings
  projectId: 'restaurant-platform',
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: true,
    json: true,
  },

  // Performance and Resource Settings
  numTestsKeptInMemory: 50,
  experimentalMemoryManagement: true,
  experimentalSourceRewriting: true,
  experimentalWebKitSupport: true,
  experimentalFetchPolyfill: true,
  experimentalModifyObstructiveThirdPartyCode: true,
});