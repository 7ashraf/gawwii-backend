// jest.config.cjs
module.exports = {
  testEnvironment: 'jest-environment-node',
  transform: {},
  globals: {
    'jest/globals': true
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/tests/**/*.test.js'],
};