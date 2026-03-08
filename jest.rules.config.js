module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/firestore/__tests__/rules.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testTimeout: 30000,
};
