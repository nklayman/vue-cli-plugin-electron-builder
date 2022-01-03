const path = require('path')

module.exports = [
  {
    name: 'electronBuilder.electronVersion',
    type: 'list',
    message: 'Choose Electron Version',
    default: '^16.0.0',
    choices: [
      {
        name: '^14.0.0',
        value: '^14.0.0',
        short: '^14.0.0'
      },
      {
        name: '^15.0.0',
        value: '^15.0.0',
        short: '^15.0.0'
      },
      {
        name: '^16.0.0',
        value: '^16.0.0',
        short: '^16.0.0'
      }
    ],
    when: () => {
      try {
        // Attempt to read package.json
        const pkg = require(path.join(process.cwd(), 'package.json'))
        // Don't show if electron version is already set
        return !pkg.devDependencies.electron
      } catch (e) {
        console.log('Unable to read package.json')
        return true
      }
    }
  },
  {
    name: 'electronBuilder.addTests',
    type: 'confirm',
    message: 'Add tests with Playwright to your project?',
    when: () => {
      try {
        // Attempt to read package.json
        const pkg = require(path.join(process.cwd(), 'package.json'))
        // Don't show if electron version is already set
        return (
          pkg.devDependencies['@vue/cli-plugin-unit-jest'] ||
          pkg.devDependencies['@vue/cli-plugin-unit-mocha']
        )
      } catch (e) {
        console.log('Unable to read package.json')
        return false
      }
    }
  }
]
