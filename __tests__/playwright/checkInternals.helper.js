const { expect } = require('@playwright/test')
const { ipcMainInvokeHandler } = require('electron-playwright-helpers')
const path = require('path')

module.exports = async ({ app, projectPath, projectName, mode }) => {
  const isWin = process.platform === 'win32'
  const isBuild = mode === 'build'
  const outputPath = projectPath(
    `dist_electron/${isWin ? 'win' : 'linux'}-unpacked/resources/app.asar`
  )
  const [window_static,window_vuePath,window_mockExternalPath,window_BASE_URL] = await ipcMainInvokeHandler(app, 'get-renderer-data')

  const [main_static,main_mockExternalPath] = await ipcMainInvokeHandler(app, 'get-main-data')

  // Base url should be root of server or packaged asar
  expect(window_BASE_URL).toBe(isBuild ? 'app://./' : '/' /* Server root */)

  // __static should point to public folder or packaged asar
  expect(path.normalize(window_static)).toBe(
    isBuild ? outputPath : projectPath('public')
  )

  // Vue should be bundled and not externalized (can't check in build because of NamedModulePlugin)
  if (!isBuild) {
    expect(path.posix.normalize(window_vuePath)).toBe(
      '../../../node_modules/vue/dist/vue.runtime.esm.js'
    )
  }

  // mockExternal should be externalized (can't check in build because of NamedModulePlugin)
  if (!isBuild) {
    expect(window_mockExternalPath).toBe('mockExternal')
  }

  expect(path.normalize(main_static)).toBe(
    isBuild ? outputPath : projectPath('public')
  )

  if (!isBuild) {
    expect(main_mockExternalPath).toBe('mockExternal')
  }
}
