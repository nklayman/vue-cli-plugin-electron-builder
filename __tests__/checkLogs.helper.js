const path = require('path')

module.exports = async ({ client, projectPath, projectName, mode }) => {
  const isWin = process.platform === 'win32'
  const isBuild = mode === 'build'
  const outputPath = projectPath(
    `dist_electron/${isWin ? 'win' : 'linux'}-unpacked/resources/app.asar`
  )
  const [__static, vuePath, mockExternalPath, BASE_URL] = await client.execute(
    'return [window.__static,window.vuePath,window.mockExternalPath,window.BASE_URL]'
  )

  // Base url should be root of server or packaged asar
  expect(BASE_URL).toBe(isBuild ? 'app://./' : '/' /* Server root */)

  // __static should point to public folder or packaged asar
  expect(path.normalize(__static)).toBe(
    isBuild ? outputPath : projectPath('public')
  )

  // Vue should be bundled and not externalized (can't check in build because of NamedModulePlugin)
  if (!isBuild) {
    expect(path.posix.normalize(vuePath)).toBe(
      '../../../node_modules/vue/dist/vue.runtime.esm.js'
    )
  }

  // mockExternal should be externalized (can't check in build because of NamedModulePlugin)
  if (!isBuild) {
    expect(mockExternalPath).toBe('mockExternal')
  }
  await client.getRenderProcessLogs().then((logs) => {
    logs.forEach((log) => {
      // Make sure there are no fatal errors
      expect(log.level).not.toBe('SEVERE')
    })
  })

  await client.getMainProcessLogs().then((logs) => {
    let appStatic = logs
      // Find __static log
      .find((m) => m.indexOf('__static=') !== -1)
      // Get just the value
      .split('=')[1]
    // Remove any quotes
    appStatic = appStatic.replace('"', '').split(',')[0]
    // __static should point to public folder or packaged asar
    expect(path.normalize(appStatic)).toBe(
      isBuild ? outputPath : projectPath('public')
    )

    let mockExternalPath = logs
      // Find externalModulePath log
      .find((v) => v.indexOf('mockExternalPath=') !== -1)
      // Get just the value
      .split('=')[1]
    // Remove any quotes
    mockExternalPath = mockExternalPath.replace('"', '').split(',')[0]
    // mockExternal should be externalized (can't check in build because of NamedModulePlugin)
    if (!isBuild) {
      expect(mockExternalPath).toBe('mockExternal')
    }
  })
}
