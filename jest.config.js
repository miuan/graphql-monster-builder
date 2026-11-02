module.exports = {
    verbose: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
    "collectCoverageFrom": [
      "**/*.{ts}",
      "!**/node_modules/**",
      "!**/vendor/**"
    ],
    "setupFilesAfterEnv": ["jest-extended"],
    testTimeout: 500000
  };
