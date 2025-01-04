import type { Config } from '@jest/types';

/**
 * Jest configuration for backend Node.js application
 * Version: Jest 29.x
 * 
 * This configuration provides comprehensive test environment settings,
 * coverage reporting, module resolution, and test execution parameters
 * with TypeScript support.
 */
const jestConfig: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript compilation
  preset: 'ts-jest',

  // Set Node.js as test environment for backend testing
  testEnvironment: 'node',

  // Define test file locations
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Test file patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  // Module path aliases mapping for clean imports
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@config/(.*)': '<rootDir>/src/config/$1',
    '@controllers/(.*)': '<rootDir>/src/api/controllers/$1',
    '@middlewares/(.*)': '<rootDir>/src/api/middlewares/$1',
    '@models/(.*)': '<rootDir>/src/models/$1',
    '@services/(.*)': '<rootDir>/src/services/$1',
    '@utils/(.*)': '<rootDir>/src/utils/$1',
    '@validators/(.*)': '<rootDir>/src/validators/$1',
    '@interfaces/(.*)': '<rootDir>/src/interfaces/$1',
    '@constants/(.*)': '<rootDir>/src/constants/$1',
    '@tests/(.*)': '<rootDir>/tests/$1'
  },

  // Coverage configuration
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types/**/*.ts',
    '!src/db/migrations/**/*.ts',
    '!src/db/seeds/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/config/*.ts'
  ],

  // Coverage thresholds enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test setup and environment configuration
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  clearMocks: true,
  testTimeout: 10000,
  verbose: true,

  // File extensions to consider for tests
  moduleFileExtensions: ['ts', 'js', 'json'],

  // TypeScript transformation configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // TypeScript compiler options for tests
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};

export default jestConfig;