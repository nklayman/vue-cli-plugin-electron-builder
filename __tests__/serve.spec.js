jest.setTimeout(100000)

const create = require('@vue/cli-test-utils/createTestProject')
const path = require('path')
const Application = require('spectron').Application
const electronPath = require('electron')
const { defaultPreset } = require('@vue/cli/lib/options')

const serve = (project, notifyUpdate) =>
  new Promise((resolve, reject) => {
    const child = project.run('vue-cli-service serve:electron')
    let isFirstMatch = true
    let log = ''
    child.stdout.on('data', async data => {
      data = data.toString()
      log += data
      try {
        const urlMatch = data.match(/http:\/\/[^/]+\//)
        if (urlMatch && isFirstMatch) {
          isFirstMatch = false
          let url = urlMatch[0]

          resolve({
            stdout: log,
            url,
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
    let preset = { ...defaultPreset }
    let projectName = 'serve'
    const projectPath = p =>
      path.join(
        process.cwd(),
        '__tests__/projects/serve' + (useTS ? '-ts' : ''),
        p
      )
    if (useTS) {
      defaultPreset.plugins['@vue/cli-plugin-typescript'] = {}
      projectName += '-ts'
    }
    // Install vcp-electron-builder
    defaultPreset.plugins['vue-cli-plugin-electron-builder'] = {}
    const project = await create(
      projectName,
      preset,
      path.join(process.cwd(), '/__tests__/projects')
    )
    //   Prevent electron from being launched
    jest.mock('execa')
    //   Wait for dev server to start
    const { stopServe, url } = await serve(project)
    expect(project.has('dist_electron/background.js')).toBe(true)
    const app = new Application({
      path: electronPath,
      args: [projectPath('dist_electron/background.js')],
      env: {
        WEBPACK_DEV_SERVER_URL: url,
        IS_TEST: true
      },
      cwd: projectPath('')
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
    })
    await client.getMainProcessLogs().then(logs => {
      logs.forEach(log => {
        //   Make sure there are no fatal errors
        expect(log.level).not.toBe('SEVERE')
      })
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
test('serve:electron', async () => {
  await runTests()
})
test('serve:electron-ts', async () => {
  await runTests(true)
})
