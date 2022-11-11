const create = require('./createProject.helper.js')

const runTests = async (useTS) => {
  const { project, projectName } = await create('build', useTS)

  const isWin = process.platform === 'win32'

  await project.run('vue-cli-service electron:build --x64 --dir')
  // Ensure /dist is not modified
  expect(project.has('dist')).toBe(false)
  // Ensure build successfully outputted files
  expect(project.has('dist_electron/bundled/index.html')).toBe(true)
  expect(project.has('dist_electron/bundled/favicon.ico')).toBe(true)
  expect(project.has('dist_electron/bundled/js')).toBe(true)
  expect(project.has('dist_electron/bundled/css')).toBe(true)
  expect(project.has('dist_electron/bundled/background.js')).toBe(true)
  if (isWin) {
    expect(project.has(`dist_electron/win-unpacked/${projectName}.exe`)).toBe(
      true
    )
  } else {
    expect(project.has(`dist_electron/linux-unpacked/${projectName}`)).toBe(
      true
    )
  }
  // Ensure that setup files were not created
  expect(project.has(`dist_electron/${projectName} Setup 0.1.0.exe`)).toBe(
    false
  )
  expect(
    project.has(`dist_electron/${projectName}-0.1.0-x86_64.AppImage`)
  ).toBe(false)
  expect(project.has(`dist_electron/${projectName}_0.1.0_amd64`)).toBe(false)

  // Launch app with playwright is done in with Playwright runner
}

module.exports.runTests = runTests
