/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  rootDir: 'src',
  roots: ['<rootDir>'],
  coveragePathIgnorePatterns: ['node_modules'],
  modulePathIgnorePatterns: ['node_modules', 'dist', 'build', 'coverage'],
  testPathIgnorePatterns: ['node_modules', 'dist', 'build', 'coverage'],
  moduleDirectories: ['node_modules', 'src'],
};
