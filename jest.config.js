module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/__tests__/setup.helper.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/projects/',
    '/generator/templates',
    '.*.helper.js'
  ],
  collectCoverageFrom: [
    'index.js',
    'generator/index.js',
    'lib/testWithPlaywright.js',
    'lib/testWithSpectron.js',
    'lib/webpackConfig.js'
  ]
}
