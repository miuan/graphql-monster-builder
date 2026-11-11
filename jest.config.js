module.exports = {
    verbose: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    snapshotFormat: { escapeString: true, printBasicPrototype: true },
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
    "collectCoverageFrom": [
      "**/*.{ts}",
      "!**/node_modules/**",
      "!**/vendor/**"
    ],
    "setupFilesAfterEnv": ["jest-extended"],
    testTimeout: 500000
  };
