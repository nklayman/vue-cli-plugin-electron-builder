module.exports = {
  extends: 'standard',
  ignorePatterns: [
    '__tests__/projects/*',
    'generator/templates/base/src/background.js'
  ],
  env: {
    jest: true
  }
}
