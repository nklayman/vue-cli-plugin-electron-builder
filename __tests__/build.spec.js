jest.setTimeout(600000)

const create = require('@vue/cli-test-utils/createTestProject')
const { defaultPreset } = require('@vue/cli/lib/options')
const path = require('path')
const fs = require('fs-extra')
const Application = require('spectron').Application

const runTests = useTS =>
  new Promise(async resolve => {
    let preset = { ...defaultPreset }
    let projectName = 'build'
    if (useTS) {
      defaultPreset.plugins['@vue/cli-plugin-typescript'] = {}
      projectName += '-ts'
    }
    const projectPath = p =>
      path.join(process.cwd(), '__tests__/projects/' + projectName, p)
    // Install vcp-electron-builder
    defaultPreset.plugins['vue-cli-plugin-electron-builder'] = {}
    const project = await create(
      projectName,
      preset,
      path.join(process.cwd(), '/__tests__/projects')
    )
    const { stdout } = await project.run(
      'vue-cli-service build:electron --x64 --win zip --linux zip'
    )
    //   Ensure built completes
    expect(stdout.indexOf('Build complete!')).not.toBe(-1)
    //   Ensure /dist is not modified
    expect(project.has('dist')).toBe(false)
    //   Ensure build successfully outputted files
    expect(project.has('dist_electron/bundled/index.html')).toBe(true)
    expect(project.has('dist_electron/bundled/favicon.ico')).toBe(true)
    expect(project.has('dist_electron/bundled/js')).toBe(true)
    expect(project.has('dist_electron/bundled/css')).toBe(true)
    expect(project.has('dist_electron/bundled/background.js')).toBe(true)
    expect(project.has(`dist_electron/win-unpacked/${projectName}.exe`)).toBe(
      true
    )
    expect(project.has(`dist_electron/linux-unpacked/${projectName}`)).toBe(
      true
    )
    //   Ensure that setup file was not created
    expect(project.has(`dist_electron/${projectName} Setup 0.1.0.exe`)).toBe(
      false
    )
    // Ensure that zip files were created
    expect(project.has(`dist_electron/${projectName}-0.1.0-win.zip`)).toBe(true)
    expect(project.has(`dist_electron/${projectName}-0.1.0.zip`)).toBe(true)
    //   Ensure base is set properly (for app protocol)
    const index = fs.readFileSync(
      projectPath('dist_electron/bundled/index.html'),
      'utf8'
    )
    expect(index.indexOf('<base href=app://./ >')).not.toBe(-1)
    const app = new Application({
      path: `./__tests__/projects/${projectName}/dist_electron/win-unpacked/${projectName}.exe`
      //   path: '../electron-test/dist_electron/win-unpacked/electron-test.exe'
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
    //   Dev tools is not open
    expect(await win.isDevToolsOpened()).toBe(false)
    //   Window is visible
    expect(await win.isVisible()).toBe(true)
    //   Size is correct
    const { width, height } = await win.getBounds()
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    // Load was successful
    expect(await app.webContents.isLoading()).toBe(false)
    //   App is loaded properly
    expect(await client.getHTML('#app')).toMatchSnapshot()

    await app.stop()
    resolve()
  })

test('build:electron', async () => {
  await runTests()
})
test('build:electron-ts', async () => {
  await runTests(true)
})
