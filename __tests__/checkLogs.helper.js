const path = require('path')

module.exports = async ({ client, projectPath, projectName, mode }) => {
  const isWin = process.platform === 'win32'
  const isBuild = mode === 'build'
  const outputPath = projectPath(
    `dist_electron/${isWin ? 'win' : 'linux'}-unpacked/resources/app.asar`
  )

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
    //   Base url should be root of server or packaged asar
    expect(path.normalize(appBaseUrl)).toBe(
      isBuild ? outputPath : path.sep /* Server root */
    )

    let appStatic = logs
      //   Find __static log
      .find(v => v.message.indexOf('__static=') !== -1)
      // Get just the value
      .message.split('=')[1]
    // Remove any quotes
    appStatic = appStatic.replace('"', '')
    //   __static should point to public folder or packaged asar
    expect(path.normalize(appStatic)).toBe(
      isBuild ? outputPath : projectPath('public')
    )

    let modulePaths = logs
      //   Find modulePath log
      .find(v => v.message.indexOf('modulePaths=') !== -1)
      // Get just the value
      .message.split('=')[1]
    // Remove last quote
    modulePaths = modulePaths.replace(/"$/, '')
    // Parse modulePaths array
    modulePaths = modulePaths.split(',')
    // Normalize paths
    modulePaths = modulePaths.map(p => path.normalize(p))
    // module.paths should include path to project's node_modules unless in build
    if (isBuild) {
      expect(modulePaths).not.toContain(
        path.join(__dirname, 'projects', projectName, 'node_modules')
      )
    } else {
      expect(modulePaths).toContain(
        path.join(__dirname, 'projects', projectName, 'node_modules')
      )
    }

    let vuePath = logs
      //   Find vuePath log
      .find(v => v.message.indexOf('vuePath=') !== -1)
      // Get just the value
      .message.split('=')[1]
    // Remove any quotes
    vuePath = vuePath.replace('"', '')
    // Vue should be bundled and not externalized (can't check in build because of NamedModulePlugin)
    if (!isBuild) {
      expect(path.posix.normalize(vuePath)).toBe(
        '../../../node_modules/vue/dist/vue.runtime.esm.js'
      )
    }

    let mockExternalPath = logs
      //   Find externalModulePath log
      .find(v => v.message.indexOf('mockExternalPath=') !== -1)
      // Get just the value
      .message.split('=')[1]
    // Remove any quotes
    mockExternalPath = mockExternalPath.replace('"', '')
    // mockExternal should be externalized (can't check in build because of NamedModulePlugin)
    if (!isBuild) {
      expect(mockExternalPath).toBe('mockExternal')
    }
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
    //   __static should point to public folder or packaged asar
    expect(path.normalize(appStatic)).toBe(
      isBuild ? outputPath : projectPath('public')
    )

    let modulePaths = logs
      //   Find modulePath log
      .find(m => m.indexOf('modulePaths=') !== -1)
      // Get just the value
      .split('=')[1]
    // Parse modulePaths array
    modulePaths = modulePaths.split(',')
    // Normalize paths
    modulePaths = modulePaths.map(p => path.normalize(p))
    // module.paths should include path to project's node_modules unless in build
    if (isBuild) {
      expect(modulePaths).not.toContain(
        path.join(__dirname, 'projects', projectName, 'node_modules')
      )
    } else {
      expect(modulePaths).toContain(
        path.join(__dirname, 'projects', projectName, 'node_modules')
      )
    }

    let mockExternalPath = logs
      //   Find externalModulePath log
      .find(v => v.indexOf('mockExternalPath=') !== -1)
      // Get just the value
      .split('=')[1]
    // Remove any quotes
    mockExternalPath = mockExternalPath.replace('"', '')
    // mockExternal should be externalized (can't check in build because of NamedModulePlugin)
    if (!isBuild) {
      expect(mockExternalPath).toBe('mockExternal')
    }
  })
}
