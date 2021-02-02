const create = require('./createProject.helper.js')
const path = require('path')
const Application = require('spectron').Application
const portfinder = require('portfinder')
const checkLogs = require('./checkLogs.helper.js')

portfinder.basePort = 9515
const runTests = async (useTS) => {
  const { project, projectName } = await create('build', useTS)

  const isWin = process.platform === 'win32'
  const projectPath = (p) =>
    path.join(process.cwd(), '__tests__/projects/' + projectName, p)

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
  // Launch app with spectron
  const app = new Application({
    path: `./__tests__/projects/${projectName}/dist_electron/${
      isWin ? 'win' : 'linux'
    }-unpacked/${projectName}${isWin ? '.exe' : ''}`,
    // Make sure tests do not interfere with each other
    port: await portfinder.getPortPromise(),
    // Increase wait timeout for parallel testing
    waitTimeout: 10000
  })
  await app.start()
  const win = app.browserWindow
  const client = app.client
  await client.waitUntilWindowLoaded()

  // Check that proper info was logged
  await checkLogs({ client, projectName, projectPath, mode: 'build' })

  // Window was created
  expect(await client.getWindowCount()).toBe(1)
  // It is not minimized
  expect(await win.isMinimized()).toBe(false)
  // Dev tools is not open
  expect(await win.isDevToolsOpened()).toBe(false)
  // Window is visible
  expect(await win.isVisible()).toBe(true)
  // Size is correct
  const { width, height } = await win.getBounds()
  expect(width).toBeGreaterThan(0)
  expect(height).toBeGreaterThan(0)
  // Load was successful
  expect(await app.webContents.isLoading()).toBe(false)
  // App is loaded properly
  expect(await (await app.client.$('#app')).getHTML()).toContain(
    `Welcome to Your Vue.js ${useTS ? '+ TypeScript ' : ''}App`
  )

  await app.stop()
}

module.exports.runTests = runTests
