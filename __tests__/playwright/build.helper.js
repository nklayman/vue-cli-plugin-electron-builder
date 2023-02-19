const { expect } = require('@playwright/test')
const { _electron: electron } = require('playwright-core')
const { findLatestBuild, parseElectronApp } = require('electron-playwright-helpers')
const path = require('path')
const getProject = require('./getProject.helper.js')
const checkInternals = require('./checkInternals.helper')

const runTests = async (useTS) => {
  const projectName = useTS ? 'build-ts' : 'build'

  const projectPath = (p) =>
    path.join(process.cwd(), '__tests__', 'projects', projectName, p)

  const project = getProject(projectName, projectPath('.'))

  const isWin = process.platform === 'win32'

  // Project has already been build in Jest tests
  // await project.run('vue-cli-service electron:build --x64 --dir')
  // Follwing tests overlap with Jest tests
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

  // Launch app with playwright
  // Temp: as findLatestBuild is not working with absolute paths in Windows
  const latestBuild = findLatestBuild(path.join('__tests__', 'projects', projectName, 'dist_electron'))
  // const latestBuild = findLatestBuild(projectPath('dist_electron'))
  const appInfo = parseElectronApp(latestBuild)

  const app = await electron.launch({
    args: [appInfo.main],
    executablePath: appInfo.executable,
    // Increase wait timeout for parallel testing
    timeout: 10000
  })

  // Check that paths are set correctly
  await checkInternals({ app, projectName, projectPath, mode: 'build' })

  const win = await app.firstWindow()
  const browserWindow = await app.browserWindow(win)
  const {
    isDevToolsOpened,
    // isLoading, // Is not consistent
    isMinimized,
    isVisible,
    height,
    width
  } = await browserWindow.evaluate((browserWindow) => {
    return {
      isDevToolsOpened: browserWindow.webContents.isDevToolsOpened(),
      // isLoading: browserWindow.webContents.isLoading(),
      isMinimized: browserWindow.isMinimized(),
      isVisible: browserWindow.isVisible(),
      ...browserWindow.getBounds()
    }
  })

  // It is not minimized
  expect(isMinimized).toBe(false)
  // Window is visible
  expect(isVisible).toBe(true)
  // Size is correct
  expect(width).toBeGreaterThan(0)
  expect(height).toBeGreaterThan(0)

  // Window was created
  expect(app.windows().length).toBe(1)
  // It is not minimized
  expect(isMinimized).toBe(false)
  // Dev tools is not open
  expect(isDevToolsOpened).toBe(false)
  // Window is visible
  expect(isVisible).toBe(true)
  // Size is correct
  expect(width).toBeGreaterThan(0)
  expect(height).toBeGreaterThan(0)
  // Load was successful
  // expect(isLoading).toBe(false)
  // App is loaded properly
  expect(
    /Welcome to Your Vue\.js (\+ TypeScript )?App/.test(
      await (await win.waitForSelector('#app')).innerHTML()
    )
  ).toBe(true)

  await app.close()
}

module.exports.runTests = runTests
