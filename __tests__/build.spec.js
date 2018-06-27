jest.setTimeout(600000)

const create = require('@vue/cli-test-utils/createTestProject')
const { defaultPreset } = require('@vue/cli/lib/options')
const path = require('path')
const fs = require('fs')

test('build:electron', async () => {
  defaultPreset.plugins['vue-cli-plugin-electron-builder'] = {
    version: 'file:../../'
  }
  //   defaultPreset.plugins['file:../../../'] = {}
  const project = await create(
    'build',
    defaultPreset,
    // {
    //   plugins: {
    //     'vue-cli-plugin-electron-builder': {
    //       version: '1.0.0-alpha.11'
    //     }
    //   }
    // },
    path.join(process.cwd(), '/__tests__/projects')
  )
  //   await project.run('yarn link vue-cli-plugin-electron-builder')
  //   await project.run('vue add electron-builder')
  //   await project.run('yarn add --dev file:../../../')
  //   await project.run('vue invoke electron-builder')
  //   const { stdout } = await project.run('vue-cli-service build')
  //   const pkg = JSON.parse(
  //     fs.readFileSync(
  //       path.join(process.cwd(), '/__tests__/projects/build/package.json')
  //     )
  //   )
  //   delete pkg.devDependencies['file:../../../']
  //   pkg.devDependencies['vue-cli-plugin-electron-builder'] = 'latest'
  //   fs.writeFileSync(
  //     path.join(process.cwd(), '/__tests__/projects/build/package.json'),
  //     JSON.stringify(pkg)
  //   )
  //   debugger
  //   await project.run('yarn link vue-cli-plugin-electron-builder')
  //   debugger
  const { stdout } = await project.run('vue-cli-service build:electron')
  //   const { stdout } = await project.run('yarn build:electron')
  debugger
  expect(stdout.indexOf('Build Complete!')).not.toBe(-1)
  expect(project.has('dist')).toBe(false)
  expect(project.has('dist_electron/bundled/index.html')).toBe(true)
  expect(project.has('dist_electron/bundled/favicon.ico')).toBe(true)
  expect(project.has('dist_electron/bundled/js')).toBe(true)
  expect(project.has('dist_electron/bundled/css')).toBe(true)
  expect(project.has('dist_electron/bundled/foo.js')).toBe(true)
})
