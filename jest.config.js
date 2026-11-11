process.env.GMB_TEST_RUN_ID ||= `${Date.now().toString(36)}_${process.pid.toString(36)}`

module.exports = {
    verbose: true,
    preset: 'ts-jest',
    testEnvironment: 'node',
    maxWorkers: 2,
    globalTeardown: '<rootDir>/jest.teardown.cjs',
    snapshotFormat: { escapeString: true, printBasicPrototype: true },
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
    collectCoverageFrom: ['**/*.{ts}', '!**/node_modules/**', '!**/vendor/**'],
    setupFilesAfterEnv: ['jest-extended/all'],
    testTimeout: 500000,
}
