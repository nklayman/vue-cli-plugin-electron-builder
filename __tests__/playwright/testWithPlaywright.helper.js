const execa = require('execa')
const path = require('path')

module.exports = async function () {
  await execa(
    require.resolve(path.join('.bin', 'playwright')),
    ['test'],
    {
      cwd: path.join(path.dirname(path.dirname(__dirname)), '__tests__', 'projects', 'playwright'),
      extendEnv: false
    }
  )
}
