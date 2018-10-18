const path = require('path')

module.exports = [
  {
    name: 'electronBuilder.electronVersion',
    type: 'list',
    message: 'Choose Electron Version',
    choices: [
      {
        name: '^2.0.0 (stable)',
        value: '^2.0.0',
        short: '^2.0.0'
      },
      {
        name: '^3.0.0 (may have small issues)',
        value: '^3.0.0',
        short: '^3.0.0'
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
  }
]
