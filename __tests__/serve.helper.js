const create = require('./createProject.helper.js')
const path = require('path')
const { _electron: electron } = require('playwright-core');
const electronPath = require('electron')
const checkLogs = require('./checkLogs.helper.js')

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
  const { project, projectName } = await create('serve', useTS)
  const projectPath = (p) =>
    path.join(process.cwd(), '__tests__/projects/' + projectName, p)
  // Wait for dev server to start
  const { stopServe } = await serve(project)
  expect(project.has('dist_electron/index.js')).toBe(true)
  // Launch app with playwright
  const app = await electron.launch({
    executablePath: electronPath,
    args: [projectPath('dist_electron')],
    env: {
      IS_TEST: true
    },
    cwd: projectPath(''),
    // Increase wait timeout for parallel testing
    timeout: 10000
  })

  await app.start()
  const win = app.browserWindow
  const client = app.client
  await client.waitUntilWindowLoaded()

  // Check that proper info was logged
  await checkLogs({ client, projectName, projectPath, mode: 'serve', useTS })

  // Window was created
  expect(await client.getWindowCount()).toBe(1)
  // It is not minimized
  expect(await win.isMinimized()).toBe(false)
  // Window is visible
  expect(await win.isVisible()).toBe(true)
  // Size is correct
  const { width, height } = await win.getBounds()
  expect(width).toBeGreaterThan(0)
  expect(height).toBeGreaterThan(0)
  // App is loaded properly
  expect(await (await app.client.$('#app')).getHTML()).toContain(
    `Welcome to Your Vue.js ${useTS ? '+ TypeScript ' : ''}App`
  )

  stopServe()
  await app.stop()
}

module.exports.runTests = runTests
