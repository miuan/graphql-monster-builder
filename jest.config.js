module.exports = {
    verbose: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    "collectCoverageFrom": [
      "**/*.{ts}",
      "!**/node_modules/**",
      "!**/vendor/**"
    ],
    testTimeout: 500000
  };