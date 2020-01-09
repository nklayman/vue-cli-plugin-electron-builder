const createProject = require('./createProject.helper.js')
const { readFile, writeFile } = require('fs-extra')
const { join } = require('path')
const execa = require('execa')

module.exports = async testRunner => {
  const plugins = {}
  plugins[`@vue/cli-plugin-unit-${testRunner}`] = {}
  const { project } = await createProject(
    `spectron-${testRunner}`,
    false,
    plugins
  )
  // Remove example test
  await project.rm('tests/unit/example.spec.js')

  // Copy electron test
  const testFile = (
    await readFile(
      `./generator/templates/tests-${testRunner}/tests/unit/electron.spec.js`,
      'utf8'
    )
  )
    // Fix some unknown error
    .replace('testWithSpectron()', 'testWithSpectron({ mode: "production" })')
  await writeFile(join(project.dir, 'tests/unit/electron.spec.js'), testFile)

  await execa(
    require.resolve('@vue/cli-service/bin/vue-cli-service'),
    ['test:unit'],
    {
      cwd: project.dir,
      extendEnv: false
    }
  )
}
