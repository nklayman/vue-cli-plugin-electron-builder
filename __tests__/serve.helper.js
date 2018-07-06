const create = require('./createProject.helper.js')
const path = require('path')
const Application = require('spectron').Application
const electronPath = require('electron')
const portfinder = require('portfinder')

portfinder.basePort = 9515
const serve = (project, notifyUpdate) =>
  new Promise((resolve, reject) => {
    const child = project.run('vue-cli-service serve:electron')
    let log = ''
    child.stdout.on('data', async data => {
      data = data.toString()
      log += data
      try {
        if (data.match(/Launching Electron\.\.\./)) {
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
const runTests = useTS =>
  new Promise(async resolve => {
    const { project, projectName } = await create('serve', useTS)
    const projectPath = p =>
      path.join(process.cwd(), '__tests__/projects/' + projectName, p)
    //   Prevent electron from being launched
    jest.mock('execa')
    //   Wait for dev server to start
    const { stopServe } = await serve(project)
    expect(project.has('dist_electron/background.js')).toBe(true)
    // Launch app with spectron
    const app = new Application({
      path: electronPath,
      args: [projectPath('dist_electron/background.js')],
      env: {
        IS_TEST: true
      },
      cwd: projectPath(''),
      //   Make sure tests do not interfere with each other
      port: await portfinder.getPortPromise()
    })

    await app.start()
    const win = app.browserWindow
    const client = app.client
    await client.waitUntilWindowLoaded()

    await client.getRenderProcessLogs().then(logs => {
      logs.forEach(log => {
        //   Make sure there are no fatal errors
        expect(log.level).not.toBe('SEVERE')
      })
      let appBaseUrl = logs
        //   Find BASE_URL log
        .find(v => v.message.indexOf('process.env.BASE_URL=') !== -1)
        // Get just the value
        .message.split('=')[1]
      // Remove any quotes
      appBaseUrl = appBaseUrl.replace('"', '')
      //   Base url should be root of server
      expect(appBaseUrl).toBe('/')
      let appStatic = logs
        //   Find __static log
        .find(v => v.message.indexOf('__static=') !== -1)
        // Get just the value
        .message.split('=')[1]
      // Remove any quotes
      appStatic = appStatic.replace('"', '')
      //   __static should point to public folder
      expect(path.normalize(appStatic)).toBe(projectPath('public'))
    })
    await client.getMainProcessLogs().then(logs => {
      logs.forEach(log => {
        //   Make sure there are no fatal errors
        expect(log.level).not.toBe('SEVERE')
      })
      let appStatic = logs
        //   Find __static log
        .find(m => m.indexOf('__static=') !== -1)
        // Get just the value
        .split('=')[1]
      // Remove any quotes
      appStatic = appStatic.replace('"', '')
      appStatic = appStatic.replace('', '')
      //   __static should point to public folder
      expect(path.normalize(appStatic)).toBe(projectPath('public'))
    })
    //   Window was created
    expect(await client.getWindowCount()).toBe(1)
    //   It is not minimized
    expect(await win.isMinimized()).toBe(false)
    //   Window is visible
    expect(await win.isVisible()).toBe(true)
    //   Size is correct
    const { width, height } = await win.getBounds()
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    //   App is loaded properly
    expect(await client.getHTML('#app')).toMatchSnapshot()

    stopServe()
    await app.stop()
    resolve()
  })

module.exports.runTests = runTests
