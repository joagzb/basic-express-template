/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  rootDir: 'src',  // Ensure 'src' matches your actual source directory
  roots: ['<rootDir>'],  // If tests are also within 'src', this is correct
  coveragePathIgnorePatterns: ['node_modules'],  // Ignore coverage for 'node_modules'
  modulePathIgnorePatterns: ['node_modules', 'dist', 'build'],  // Ignore these directories for module resolution
  testPathIgnorePatterns: ['node_modules', 'dist', 'build'],  // Same directories for test path ignoring
  moduleDirectories: ['node_modules', 'src'],  // Specify where modules are located
};