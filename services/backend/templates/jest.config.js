module.exports = {
    verbose: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    "collectCoverageFrom": [
      "**/*.{ts}",
      "!**/node_modules/**",
      "!**/vendor/**"
    ],
    "setupFilesAfterEnv": ["jest-extended"],
    testTimeout: 500000
  };