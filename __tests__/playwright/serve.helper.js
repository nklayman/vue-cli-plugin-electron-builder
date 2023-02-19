const { expect } = require('@playwright/test')
const { _electron: electron } = require('playwright-core')
const path = require('path')
const getProject = require('./getProject.helper.js')
const checkInternals = require('./checkInternals.helper.js')

const serve = (project, notifyUpdate) =>
  new Promise((resolve, reject) => {
    // --debug to prevent Electron from being launched
    const child = project.run('vue-cli-service electron:serve --headless')
    let log = ''
    child.stdout.on('data', async (data) => {
      data = data.toString()
      log += data
      try {
        if (
          data.match(
            // Dev server is finished and index.js is created
            /\$WEBPACK_DEV_SERVER_URL=/
          )
        ) {
          resolve({
            stdout: log,
            stopServe: () => {
              child.stdin.write('close')
            }
          })
        } else if (data.match(/App updated/)) {
          if (notifyUpdate) {
            notifyUpdate(data)
          }
        } else if (data.match(/Failed to compile/)) {
          reject(data)
        }
      } catch (err) {
        reject(err)
      }
    })
  })
const runTests = async (useTS) => {
  const projectName = useTS ? 'serve-ts' : 'serve'

  const projectPath = (p) =>
    path.join(process.cwd(), '__tests__', 'projects', projectName, p)

  const project = getProject(projectName, projectPath('.'))

  // Wait for dev server to start
  const { stopServe } = await serve(project)
  expect(project.has(path.join('dist_electron', 'index.js'))).toBe(true)

  // Launch app with playwright
  const app = await electron.launch({
    args: [projectPath(path.join('dist_electron', 'index.js'))],
    env: {
      ...process.env,
      IS_TEST: true
    },
    cwd: projectPath(''),
    // Make sure tests do not interfere with each other
    // Increase wait timeout for parallel testing
    timeout: 10000
  })

  // Check that paths are set correctly
  await checkInternals({ app, projectName, projectPath, mode: 'serve' })

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

  stopServe()
  await app.close()
}

module.exports.runTests = runTests
