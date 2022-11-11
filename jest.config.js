module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/__tests__/setup.helper.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/playwright/',
    '/__tests__/projects/',
    '/generator/templates',
    '.*.helper.js'
  ],
  collectCoverageFrom: [
    'index.js',
    'generator/index.js',
    'lib/testWithPlaywright.helper.js',
    'lib/webpackConfig.js'
  ]
}
