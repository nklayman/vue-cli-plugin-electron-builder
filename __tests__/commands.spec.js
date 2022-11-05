// #region Imports
const pluginIndex = require('../index.js')
const testWithSpectron = pluginIndex.testWithSpectron
const webpack = require('webpack')
const builder = require('electron-builder')
const fs = require('fs-extra')
const path = require('path')
const execa = require('execa')
const portfinder = require('portfinder')
const Application = require('spectron').Application
const { chainWebpack, getExternals } = require('../lib/webpackConfig')
const chokidar = require('chokidar')
const spectron = require('spectron')
// #endregion

// #region Mocks
process.env.IS_TEST = true
const mockYargsParse = jest.fn()
const mockYargsCommand = jest.fn(() => ({ parse: mockYargsParse }))
jest.mock('yargs', () => ({ command: mockYargsCommand }))
jest.mock('@vue/cli-service/lib/commands/build')
jest.mock('fs-extra')
jest.mock('@vue/cli-service/lib/commands/build/formatStats')
jest.mock('../lib/removeJunk.js', () => jest.fn(() => 'removeJunk'))
jest.mock('electron-builder')
const mockInstallAppDeps = jest.fn()
jest.mock('electron-builder/out/cli/install-app-deps.js', () => ({
  installAppDeps: mockInstallAppDeps
}))
jest.mock('../lib/webpackConfig.js')
jest.mock('chokidar')
global.setTimeout = jest.fn()
const mockPipe = jest.fn()
const childEvents = {}
const mockExeca = {
  on: jest.fn((eventName, cb) => {
    childEvents[eventName] = cb
  }),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  kill: jest.fn(),
  send: jest.fn(),
  stdout: {
    pipe: jest.fn(() => ({ pipe: mockPipe }))
  },
  stderr: {
    pipe: jest.fn(() => ({ pipe: mockPipe }))
  }
}
jest.mock('execa', () => jest.fn(() => mockExeca))
jest.mock('@vue/cli-service/lib/commands/serve', () => ({
  serve: jest.fn().mockResolvedValue({ url: 'serveUrl' })
}))
jest.mock('electron-builder', () => ({ build: jest.fn().mockResolvedValue() }))
// Mock package.json
fs.readFileSync.mockReturnValue(
  JSON.stringify({
    dependencies: {}
  })
)
const mockWait = jest.fn().mockResolvedValue()
const mockStart = jest.fn()
jest.mock('spectron', () => ({
  Application: jest.fn().mockImplementation(() => ({
    start: mockStart,
    client: { waitUntilWindowLoaded: mockWait }
  }))
}))
// Prevent console.log statements from index
console.log = jest.fn()
beforeEach(() => {
  jest.clearAllMocks()
})
chokidar.watch.mockImplementation((file) => {
  return {
    on: (type, cb) => {}
  }
})
// #endregion

// #region runCommand
const serviceRun = jest.fn().mockResolvedValue({ url: 'serveUrl' })
const runCommand = async (command, options = {}, args = {}, rawArgs = []) => {
  if (!args._) args._ = []
  const commands = {}
  const api = {
    // Make app think typescript plugin is installed
    hasPlugin: jest.fn().mockReturnValue(true),
    registerCommand: jest.fn().mockImplementation((name, options, command) => {
      // Save registered commands
      commands[name] = command
    }),
    // So we can ensure that files were resolved properly
    resolve: jest.fn((path) => 'projectPath/' + path),
    chainWebpack: jest.fn(),
    service: {
      // Mock api.service.run('build/serve')
      run: serviceRun,
      context: process.cwd()
    }
  }
  // Run the plugin, saving it's registered commands
  pluginIndex(api, options)
  // Run the provided command
  await commands[command](args, rawArgs)
  return { api, options }
}
// #endregion

describe('electron:build', () => {
  process.env.NODE_ENV = 'production'

  test('typescript is disabled when set in options', async () => {
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          disableMainProcessTypescript: true
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    // Typescript rule is not added
    expect(Object.keys(mainConfig)).not.toContain('module')
    // Ts files are not resolved
    expect(
      mainConfig.resolve.extensions ? mainConfig.resolve.extensions : []
    ).not.toContain('ts')
    // Proper entry file is used
    expect(mainConfig.entry.background[0]).toBe('projectPath/src/background.js')
  })

  test('custom background file is used if provided', async () => {
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          mainProcessFile: 'customBackground.js'
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    // Proper entry file is used
    expect(mainConfig.entry.background[0]).toBe(
      'projectPath/customBackground.js'
    )
  })

  test('custom output dir is used if set in vue.config.js', async () => {
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          outputDir: 'output'
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    // Main config output is correct
    expect(mainConfig.output.path).toBe('projectPath/output/bundled')
    // cli-service build output is correct
    expect(serviceRun.mock.calls[0][1].dest).toBe(`output${path.sep}bundled`)
    // Electron-builder output is correct
    expect(builder.build.mock.calls[0][0].config.directories.output).toBe(
      'output'
    )
  })

  test('custom output dir is used if dest arg is passed', async () => {
    await runCommand('electron:build', {}, { dest: 'output' })

    const mainConfig = webpack.mock.calls[0][0]
    // Main config output is correct
    expect(mainConfig.output.path).toBe('projectPath/output/bundled')
    // cli-service build output is correct
    expect(serviceRun.mock.calls[0][1].dest).toBe(`output${path.sep}bundled`)
    // Electron-builder output is correct
    expect(builder.build.mock.calls[0][0].config.directories.output).toBe(
      'output'
    )
  })

  test('Custom main process webpack config is used if provided', async () => {
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          chainWebpackMainProcess: (config) => {
            config.node.set('shouldBe', 'expected')
            return config
          }
        }
      }
    })
    const mainConfig = webpack.mock.calls[0][0]
    // Custom node key is passed through
    expect(mainConfig.node.shouldBe).toBe('expected')
  })

  test('process.env.IS_ELECTRON is set to true', async () => {
    await runCommand('electron:build')
    expect(process.env.IS_ELECTRON).toBe('true')
  })

  test('Custom Electron Builder config is used if provided', async () => {
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          builderOptions: {
            shouldBe: 'expected'
          }
        }
      }
    })
    // Custom electron-builder config is used
    expect(builder.build.mock.calls[0][0].config.shouldBe).toBe('expected')
  })

  test('.js and .ts are merged into file extensions', async () => {
    await runCommand('electron:build')

    const mainConfig = webpack.mock.calls[0][0]
    // Both .js and .ts are resolved
    expect(mainConfig.resolve.extensions).toEqual(['.js', '.ts'])
  })

  test.each([
    ['--mode', 'someMode'],
    ['--skip-plugins', 'somePlugin'],
    ['--legacy'],
    ['--dashboard'],
    ['--skipBundle'],
    ['--skipElectronBuild'],
    ['--dest', 'output'],
    ['--report'],
    ['--report-json']
  ])('%s argument is removed from electron-builder args', async (...args) => {
    await runCommand('electron:build', {}, {}, ['--keep1', ...args, '--keep2'])
    // Custom args should have been removed, and other args kept
    expect(mockYargsParse).toBeCalledWith(['--keep1', '--keep2'])
    mockYargsParse.mockClear()

    await runCommand('electron:build', {}, {}, [...args, '--keep2'])
    // Custom args should have been removed, and other args kept
    expect(mockYargsParse).toBeCalledWith(['--keep2'])
    mockYargsParse.mockClear()

    await runCommand('electron:build', {}, {}, ['--keep1', ...args])
    // Custom args should have been removed, and other args kept
    expect(mockYargsParse).toBeCalledWith(['--keep1'])
    mockYargsParse.mockClear()

    await runCommand('electron:build', {}, {}, args)
    // Custom args should have been removed
    expect(mockYargsParse).toBeCalledWith([])
    mockYargsParse.mockClear()

    await runCommand('electron:build', {}, {}, ['--keep1', '--keep2'])
    // Nothing should be removed
    expect(mockYargsParse).toBeCalledWith(['--keep1', '--keep2'])
  })

  test('Modern mode is enabled by default', async () => {
    await runCommand('electron:build')
    expect(serviceRun.mock.calls[0][1].modern).toBe(true)
  })

  test('Modern mode is disabled if --legacy arg is passed', async () => {
    await runCommand('electron:build', {}, { legacy: true })
    expect(serviceRun.mock.calls[0][1].modern).toBe(false)
  })

  test.each(['report', 'report-json'])(
    '--%s arg is passed to renderer build',
    async (argName) => {
      const args = {}
      args[argName] = true
      await runCommand('electron:build', {}, args)
      expect(serviceRun.mock.calls[0][1][argName]).toBe(true)
    }
  )

  test('App is not bundled if --skipBundle arg is passed', async () => {
    await runCommand('electron:build', {}, { skipBundle: true })
    expect(serviceRun).not.toBeCalled()
    expect(webpack).not.toBeCalled()
  })

  test('Env vars prefixed with VUE_APP_ are available in main process config', async () => {
    process.env.VUE_APP_TEST = 'expected'
    await runCommand('electron:build')
    const mainConfig = webpack.mock.calls[0][0]
    // Env var is set correctly
    expect(mainConfig.plugins[1].defaultValues.VUE_APP_TEST).toBe('expected')
  })

  test('Main process file is not bundled if pluginOptions.bundleMainProcess is false', async () => {
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          bundleMainProcess: false,
          mainProcessFile: 'myBackgroundFile.js',
          outputDir: 'outputDir'
        }
      }
    })

    // Background file wasn't built
    expect(webpack).not.toBeCalled()
    // Copied to proper dir instead
    expect(fs.copySync).toBeCalledWith(
      'projectPath/myBackgroundFile.js',
      'projectPath/outputDir/bundled/background.js'
    )
  })

  test('Base url/public path is set to "app://./"', async () => {
    const { options } = await runCommand('electron:build')
    expect(options.baseUrl).toBe('app://./')
    expect(options.publicPath).toBe('app://./')
  })

  test('Custom file protocol is used if set', async () => {
    const { options } = await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          customFileProtocol: 'expected'
        }
      }
    })
    expect(options.baseUrl).toBe('expected')
    expect(options.publicPath).toBe('expected')
  })

  test('Adds mock legacy assets file for index', async () => {
    await runCommand('electron:build')
    expect(fs.writeFileSync).toBeCalledWith(
      `dist_electron${path.sep}bundled${path.sep}legacy-assets-index.html.json`,
      '[]'
    )
  })

  test.each(['string config', 'object config'])(
    'Adds mock legacy assets file for each page (%s)',
    async (configType) => {
      const stringConfig = configType === 'string config'
      await runCommand('electron:build', {
        pages: {
          index: stringConfig ? '' : { filename: 'index.html' },
          subpage: stringConfig ? '' : { filename: 'subdir/subpage.html' }
        }
      })
      expect(fs.writeFileSync).toBeCalledWith(
        `dist_electron${path.sep}bundled${path.sep}legacy-assets-index.html.json`,
        '[]'
      )
      expect(fs.writeFileSync).toBeCalledWith(
        `dist_electron${path.sep}bundled${path.sep}${
          stringConfig ? '' : 'subdir' + path.sep
        }legacy-assets-subpage.html.json`,
        '[]'
      )
    }
  )

  test('Only external deps are included in the package.json', async () => {
    fs.readFileSync.mockReturnValueOnce(
      JSON.stringify({
        dependencies: {
          nonExternal: '^0.0.1',
          external: '^0.0.1'
        }
      })
    )
    getExternals.mockReturnValueOnce({ external: 'require("external")' })

    await runCommand('electron:build')

    expect(fs.writeFileSync).toBeCalledWith(
      'dist_electron/bundled/package.json',
      JSON.stringify(
        {
          dependencies: {
            external: '^0.0.1'
          }
        },
        null,
        2
      )
    )
  })

  test('Config arguments overwrite config', async () => {
    jest.unmock('yargs')
    await runCommand('electron:build', undefined, undefined, [
      '-c.directories.output=customDist'
    ])

    expect(builder.build.mock.calls[0][0].config.directories.output).toBe(
      'customDist'
    )
  })

  test('Preload file is bundled if set', async () => {
    const mockRun = jest
      .fn()
      .mockImplementation((cb) => cb(undefined, { hasErrors: () => false }))
    webpack.mockReturnValue({ run: mockRun })
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          preload: 'preloadFile'
        }
      }
    })
    // Both main process and preload file should have been built
    expect(webpack).toBeCalledTimes(2)
    const preloadWebpackCall = webpack.mock.calls[1][0]
    expect(preloadWebpackCall.target).toBe('electron-preload')
    expect(preloadWebpackCall.entry).toEqual({
      preload: ['projectPath/preloadFile']
    })
    // Make sure preload bundle has been run
    expect(mockRun).toHaveBeenCalledTimes(2)
    webpack.mockClear()
  })

  test('Multiple preload files can be bundled', async () => {
    const mockRun = jest
      .fn()
      .mockImplementation((cb) => cb(undefined, { hasErrors: () => false }))
    webpack.mockReturnValue({ run: mockRun })
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          preload: { firstPreload: 'preload1', secondPreload: 'preload2' }
        }
      }
    })
    // Both main process and preload file should have been built
    expect(webpack).toBeCalledTimes(2)
    const preloadWebpackCall = webpack.mock.calls[1][0]
    expect(preloadWebpackCall.target).toBe('electron-preload')
    expect(preloadWebpackCall.entry).toEqual({
      firstPreload: ['projectPath/preload1'],
      secondPreload: ['projectPath/preload2']
    })
    // Make sure preload bundle has been run
    expect(mockRun).toHaveBeenCalledTimes(2)
    webpack.mockClear()
  })
})

describe('electron:serve', () => {
  process.env.NODE_ENV = 'development'
  const isWin = process.platform === 'win32'

  test('typescript is disabled when set in options', async () => {
    await runCommand('electron:serve', {
      pluginOptions: {
        electronBuilder: {
          disableMainProcessTypescript: true
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    // Typescript rule is not added
    expect(Object.keys(mainConfig)).not.toContain('module')
    // Ts files are not resolved
    expect(
      mainConfig.resolve.extensions ? mainConfig.resolve.extensions : []
    ).not.toContain('ts')
    // Proper entry file is used
    expect(mainConfig.entry.index[0]).toBe('projectPath/src/background.js')
  })

  test('custom background file is used if provided', async () => {
    await runCommand('electron:serve', {
      pluginOptions: {
        electronBuilder: {
          mainProcessFile: 'customBackground.js'
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    // Proper entry file is used
    expect(mainConfig.entry.index[0]).toBe('projectPath/customBackground.js')
  })

  test('custom output dir is used if set in vue.config.js', async () => {
    await runCommand('electron:serve', {
      pluginOptions: {
        electronBuilder: {
          outputDir: 'output'
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    // Main config output is correct
    expect(mainConfig.output.path).toBe('projectPath/output')
  })

  test('Custom main process webpack config is used if provided', async () => {
    await runCommand('electron:serve', {
      pluginOptions: {
        electronBuilder: {
          chainWebpackMainProcess: (config) => {
            config.node.set('shouldBe', 'expected')
            return config
          }
        }
      }
    })
    const mainConfig = webpack.mock.calls[0][0]
    // Custom node key is passed through
    expect(mainConfig.node.shouldBe).toBe('expected')
  })

  test('Custom launch arguments are used if provided', async () => {
    let watchCb
    chokidar.watch.mockImplementation(() => {
      return {
        on: (type, cb) => {
          // Set callback to be called later
          watchCb = cb
        }
      }
    })
    await runCommand('electron:serve', {
      pluginOptions: {
        electronBuilder: {
          mainProcessFile: 'customBackground',
          mainProcessArgs: ['--a-flag', 'a-value']
        }
      }
    })

    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa.mock.calls[0][1]).toEqual([
      'dist_electron',
      '--a-flag',
      'a-value'
    ])

    let exitCb
    mockExeca.on.mockImplementationOnce((eventName, cb) => {
      expect(eventName).toBe('exit')
      exitCb = cb
    })
    // Mock change of background file
    watchCb()
    // Call exit callback because app should have quit
    await exitCb()
    // Flush promises, only required on node v10 for some reason
    await (() => new Promise((resolve) => setImmediate(resolve)))()
    expect(mockExeca.removeListener.mock.calls[0][0]).toBe('exit')

    expect(execa).toHaveBeenCalledTimes(2)
    expect(execa.mock.calls[0][1]).toEqual([
      'dist_electron',
      '--a-flag',
      'a-value'
    ])
  })

  test('process.env.IS_ELECTRON is set to true', async () => {
    await runCommand('electron:serve')
    expect(process.env.IS_ELECTRON).toBe('true')
  })

  test('If --debug argument is passed, electron is not launched, main process is not minified, and source maps are enabled', async () => {
    await runCommand('electron:serve', {}, { debug: true })
    const mainConfig = webpack.mock.calls[0][0]

    // UglifyJS plugin does not exist
    expect(
      mainConfig.plugins.find(
        (p) => p.__pluginConstructorName === 'UglifyJsPlugin'
      )
    ).toBeUndefined()
    // Source maps are enabled
    expect(mainConfig.devtool).toBe('source-map')
    // Electron is not launched
    expect(execa).not.toBeCalled()
  })

  test('.js and .ts are merged into file extensions', async () => {
    await runCommand('electron:serve')

    const mainConfig = webpack.mock.calls[0][0]
    // Both .js and .ts are resolved
    expect(mainConfig.resolve.extensions).toEqual(['.js', '.ts'])
  })

  test('Main process is recompiled and Electron is relaunched on main process file change', async () => {
    // So we can make sure it wasn't called
    jest.spyOn(process, 'exit')
    let watchCb
    chokidar.watch.mockImplementation(() => {
      return {
        on: (type, cb) => {
          // Set callback to be called later
          watchCb = cb
        }
      }
    })
    await runCommand('electron:serve', {
      pluginOptions: {
        electronBuilder: {
          // Make sure it watches proper background file
          mainProcessFile: 'customBackground'
        }
      }
    })

    // Proper file is watched
    expect(chokidar.watch.mock.calls[0][0]).toEqual([
      'projectPath/customBackground'
    ])
    // Child has not yet been killed or unwatched
    expect(mockExeca.send).not.toBeCalled()
    expect(mockExeca.kill).not.toBeCalled()
    expect(mockExeca.removeAllListeners).not.toBeCalled()
    // Main process was bundled and Electron was launched initially
    expect(webpack).toHaveBeenCalledTimes(1)
    expect(execa).toHaveBeenCalledTimes(1)

    let exitCb
    mockExeca.on.mockImplementationOnce((eventName, cb) => {
      expect(eventName).toBe('exit')
      exitCb = cb
    })
    // Mock change of background file
    watchCb()
    // Call exit callback because app should have quit
    await exitCb()
    // Flush promises, only required on node v10 for some reason
    await (() => new Promise((resolve) => setImmediate(resolve)))()
    expect(mockExeca.removeListener.mock.calls[0][0]).toBe('exit')
    // Electron was killed and listeners removed
    if (isWin) {
      expect(mockExeca.send).toHaveBeenCalledTimes(1)
      expect(mockExeca.send).toHaveBeenCalledWith('graceful-exit')
    } else {
      expect(mockExeca.kill).toHaveBeenCalledTimes(1)
      expect(mockExeca.kill).toHaveBeenCalledWith('SIGTERM')
    }
    // Process did not exit on Electron close
    expect(process.exit).not.toBeCalled()
    // Main process file was recompiled
    expect(webpack).toHaveBeenCalledTimes(2)
    // Electron was re-launched
    expect(execa).toHaveBeenCalledTimes(2)
  })

  test('Main process is recompiled and Electron is relaunched when file in list change', async () => {
    // So we can make sure it wasn't called
    jest.spyOn(process, 'exit')
    const watchCb = {}
    chokidar.watch.mockImplementation((files) => {
      return {
        on: (type, cb) => {
          files.forEach((file) => {
            // Set callback to be called later
            watchCb[file] = cb
          })
        }
      }
    })
    await runCommand('electron:serve', {
      pluginOptions: {
        electronBuilder: {
          // Make sure background file is watch as well
          mainProcessFile: 'customBackground',
          // Custom file that should be watched
          mainProcessWatch: ['listFile']
        }
      }
    })

    // Proper file is watched
    expect(chokidar.watch.mock.calls[0][0]).toEqual([
      'projectPath/customBackground',
      'projectPath/listFile'
    ])
    // Child has not yet been killed or unwatched
    expect(mockExeca.send).not.toBeCalled()
    expect(mockExeca.kill).not.toBeCalled()
    expect(mockExeca.removeAllListeners).not.toBeCalled()
    // Main process was bundled and Electron was launched initially
    expect(webpack).toHaveBeenCalledTimes(1)
    expect(execa).toHaveBeenCalledTimes(1)

    let exitCb
    mockExeca.on.mockImplementationOnce((eventName, cb) => {
      expect(eventName).toBe('exit')
      exitCb = cb
    })
    // Mock change of listed file
    watchCb['projectPath/listFile']()
    // Call exit callback because app should have quit
    await exitCb()
    // Flush promises, only required on node v10 for some reason
    await (() => new Promise((resolve) => setImmediate(resolve)))()
    expect(mockExeca.removeListener.mock.calls[0][0]).toBe('exit')
    // Electron was killed and listeners removed
    if (isWin) {
      expect(mockExeca.send).toHaveBeenCalledTimes(1)
      expect(mockExeca.send).toHaveBeenCalledWith('graceful-exit')
    } else {
      expect(mockExeca.kill).toHaveBeenCalledTimes(1)
      expect(mockExeca.kill).toHaveBeenCalledWith('SIGTERM')
    }
    // Process did not exit on Electron close
    expect(process.exit).not.toBeCalled()
    // Main process file was recompiled
    expect(webpack).toHaveBeenCalledTimes(2)
    // Electron was re-launched
    expect(execa).toHaveBeenCalledTimes(2)

    mockExeca.on.mockImplementationOnce((eventName, cb) => {
      expect(eventName).toBe('exit')
      exitCb = cb
    })
    // Mock change of background file
    watchCb['projectPath/customBackground']()
    // Call exit callback because app should have quit
    await exitCb()
    // Flush promises, only required on node v10 for some reason
    await (() => new Promise((resolve) => setImmediate(resolve)))()
    expect(mockExeca.removeListener.mock.calls[0][0]).toBe('exit')
    // Electron was killed and listeners removed
    if (isWin) {
      expect(mockExeca.send).toHaveBeenCalledTimes(2)
      expect(mockExeca.send).toHaveBeenCalledWith('graceful-exit')
    } else {
      expect(mockExeca.kill).toHaveBeenCalledTimes(2)
      expect(mockExeca.kill).toHaveBeenCalledWith('SIGTERM')
    }
    // Process did not exit on Electron close
    expect(process.exit).not.toBeCalled()
    // Main process file was recompiled
    expect(webpack).toHaveBeenCalledTimes(3)
    // Electron was re-launched
    expect(execa).toHaveBeenCalledTimes(3)
  })

  test('Preload file is watched for changes', async () => {
    await runCommand('electron:serve', {
      pluginOptions: {
        electronBuilder: {
          // Set preload file
          preload: 'preloadFile'
        }
      }
    })

    // Proper file is watched
    expect(chokidar.watch.mock.calls[0][0]).toContain('projectPath/preloadFile')
  })

  test('Junk output is stripped from electron child process', async () => {
    await runCommand('electron:serve')

    // Junk is removed
    expect(mockExeca.stderr.pipe).toBeCalledWith('removeJunk')
    expect(mockExeca.stdout.pipe).toBeCalledWith('removeJunk')
    // Output is piped to console
    expect(mockPipe).toBeCalledWith(process.stderr)
    expect(mockPipe).toBeCalledWith(process.stdout)
  })

  test('Junk output is not stripped from electron child process if removeElectronJunk is set to false', async () => {
    await runCommand('electron:serve', {
      pluginOptions: { electronBuilder: { removeElectronJunk: false } }
    })

    // Junk is not removed
    expect(mockPipe).not.toBeCalled()
    expect(mockPipe).not.toBeCalled()
    // Output is still piped to console
    expect(mockExeca.stderr.pipe).toBeCalledWith(process.stderr)
    expect(mockExeca.stdout.pipe).toBeCalledWith(process.stdout)
  })

  test('package.json is copied', async () => {
    await runCommand('electron:serve', {
      pluginOptions: { electronBuilder: { outputDir: 'outputDir' } }
    })

    expect(fs.copySync).toBeCalledWith(
      'projectPath/./package.json',
      'outputDir/package.json'
    )
  })

  test('Main process file is not bundled if pluginOptions.bundleMainProcess is false', async () => {
    await runCommand('electron:serve', {
      pluginOptions: {
        electronBuilder: {
          bundleMainProcess: false,
          mainProcessFile: 'myBackgroundFile.js',
          outputDir: 'outputDir'
        }
      }
    })

    // Background file wasn't built
    expect(webpack).not.toBeCalled()
    // Copied to proper dir instead
    expect(fs.copySync).toBeCalledWith(
      'projectPath/myBackgroundFile.js',
      'projectPath/outputDir/index.js'
    )
  })

  test.each([
    ['--dashboard'],
    ['--debug'],
    ['--headless'],
    ['--skip-plugins', 'somePlugin']
  ])('%s argument is not passed to electron', async (...args) => {
    await runCommand('electron:serve', {}, {}, ['--keep1', ...args, '--keep2'])
    // Custom args should have been removed, and other args kept
    let calledArgs = execa.mock.calls[0][1]
    // Remove dist_electron
    calledArgs.shift()
    expect(calledArgs).toEqual(['--keep1', '--keep2'])
    execa.mockClear()

    await runCommand('electron:serve', {}, {}, [...args, '--keep2'])
    // Custom args should have been removed, and other args kept
    calledArgs = execa.mock.calls[0][1]
    // Remove dist_electron
    calledArgs.shift()
    expect(calledArgs).toEqual(['--keep2'])
    execa.mockClear()

    await runCommand('electron:serve', {}, {}, ['--keep1', ...args])
    // Custom args should have been removed, and other args kept
    calledArgs = execa.mock.calls[0][1]
    // Remove dist_electron
    calledArgs.shift()
    expect(calledArgs).toEqual(['--keep1'])
    execa.mockClear()

    await runCommand('electron:serve', {}, {}, args)
    // Custom args should have been removed
    calledArgs = execa.mock.calls[0][1]
    // Remove dist_electron
    calledArgs.shift()
    expect(calledArgs).toEqual([])
    execa.mockClear()

    await runCommand('electron:serve', {}, {}, ['--keep1', '--keep2'])
    // Nothing should be removed
    calledArgs = execa.mock.calls[0][1]
    // Remove dist_electron
    calledArgs.shift()
    expect(calledArgs).toEqual(['--keep1', '--keep2'])
    execa.mockClear()
  })

  test('Electron is launched with arguments', async () => {
    await runCommand('electron:serve', {}, {}, ['--expected'])
    const args = execa.mock.calls[0][1]
    expect(args).toContain('--expected')
  })

  test('Preload file is bundled if set', async () => {
    const mockRun = jest
      .fn()
      .mockImplementation((cb) => cb(undefined, { hasErrors: () => false }))
    webpack.mockReturnValue({ run: mockRun })
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          preload: 'preloadFile'
        }
      }
    })
    // Both main process and preload file should have been built
    expect(webpack).toBeCalledTimes(2)
    const preloadWebpackCall = webpack.mock.calls[1][0]
    expect(preloadWebpackCall.target).toBe('electron-preload')
    expect(preloadWebpackCall.entry).toEqual({
      preload: ['projectPath/preloadFile']
    })
    // Make sure preload bundle has been run
    expect(mockRun).toHaveBeenCalledTimes(2)
    webpack.mockClear()
  })

  test('Multiple preload files can be bundled', async () => {
    const mockRun = jest
      .fn()
      .mockImplementation((cb) => cb(undefined, { hasErrors: () => false }))
    webpack.mockReturnValue({ run: mockRun })
    await runCommand('electron:build', {
      pluginOptions: {
        electronBuilder: {
          preload: { firstPreload: 'preload1', secondPreload: 'preload2' }
        }
      }
    })
    // Both main process and preload file should have been built
    expect(webpack).toBeCalledTimes(2)
    const preloadWebpackCall = webpack.mock.calls[1][0]
    expect(preloadWebpackCall.target).toBe('electron-preload')
    expect(preloadWebpackCall.entry).toEqual({
      firstPreload: ['projectPath/preload1'],
      secondPreload: ['projectPath/preload2']
    })
    // Make sure preload bundle has been run
    expect(mockRun).toHaveBeenCalledTimes(2)
    webpack.mockClear()
  })
})

describe('Custom webpack chain', () => {
  test('Custom webpack config is used', () => {
    chainWebpack.mockReturnValueOnce('expected')
    const api = {
      chainWebpack: jest.fn(),
      hasPlugin: jest.fn(),
      registerCommand: jest.fn()
    }
    const options = {
      pluginOptions: { electronBuilder: { shouldBe: 'expected' } }
    }
    // Initiate plugin with mock api
    pluginIndex(api, options)
    // Run chainWebpack function
    api.chainWebpack.mock.calls[0][0]('chainableConfig')
    // Custom webpack config should be activated
    expect(chainWebpack).toBeCalledWith(
      // API is passed through
      api,
      // Plugin options are passed through
      { shouldBe: 'expected' },
      // Config is passed through
      'chainableConfig'
    )
  })

  test('Env vars prefixed with VUE_APP_ are available in main process config', async () => {
    process.env.VUE_APP_TEST = 'expected'
    await runCommand('electron:serve')
    const mainConfig = webpack.mock.calls[0][0]
    // Env var is set correctly
    expect(mainConfig.plugins[1].defaultValues.VUE_APP_TEST).toBe('expected')
  })
})

describe('testWithSpectron', () => {
  // Mock portfinder's returned port
  portfinder.getPortPromise = jest.fn().mockResolvedValue('expectedPort')

  const runSpectron = async (spectronOptions, launchOptions = {}) => {
    let sendData
    execa.mockReturnValueOnce({
      on: jest.fn(),
      stdout: {
        on: (event, callback) => {
          if (event === 'data') {
            // Save callback to be called later
            sendData = callback
          }
        }
      }
    })
    const testPromise = testWithSpectron(spectron, spectronOptions)
    // Mock console.log from electron:serve
    if (launchOptions.customLog) await sendData(launchOptions.customLog)
    await sendData(`$outputDir=${launchOptions.outputDir || 'dist_electron'}`)
    await sendData(
      `$WEBPACK_DEV_SERVER_URL=${launchOptions.url || 'http://localhost:8080/'}`
    )
    return testPromise
  }

  test('uses custom output dir and url', async () => {
    const { url } = await runSpectron(
      {},
      {
        url: 'http://localhost:1234/',
        outputDir: 'customOutput'
      }
    )
    // Proper URL is returned
    expect(url).toBe('http://localhost:1234/')
    const appArgs = Application.mock.calls[0][0]
    // Spectron is launched with proper path to output dir
    expect(appArgs.args).toEqual(['customOutput'])
  })

  test('secures an open port with portfinder', async () => {
    await runSpectron()
    // Port should match portfinder's mock return value
    expect(Application.mock.calls[0][0].port).toBe('expectedPort')
  })

  test("doesn't start app if noStart option is provided", async () => {
    await runSpectron({ noStart: true })
    // App should not be started nor waited for to load
    expect(mockStart).not.toBeCalled()
    expect(mockWait).not.toBeCalled()
  })

  test("doesn't launch spectron if noSpectron option is provided", async () => {
    await runSpectron({ noSpectron: true })
    // Spectron instance should not be created
    expect(Application).not.toBeCalled()
  })

  test('uses custom spectron options if provided', async () => {
    await runSpectron({ spectronOptions: { testKey: 'expected' } })
    // Custom spectron option is passed through
    expect(Application.mock.calls[0][0].testKey).toBe('expected')
  })

  test('launches dev server in production mode if forceDev argument is not provided', async () => {
    await runSpectron()

    // Node env was set to production
    expect(execa.mock.calls[0][2].env.NODE_ENV).toBe('production')
  })

  test('launches dev server in dev mode if forceDev argument is provided', async () => {
    await runSpectron({ forceDev: true })

    // Node env was set to development
    expect(execa.mock.calls[0][2].env.NODE_ENV).toBe('development')
  })

  test('default vue mode is test', async () => {
    await runSpectron()

    // Mode argument was set to test
    expect(execa.mock.calls[0][1].join(' ').indexOf('--mode test')).not.toBe(-1)
  })

  test('custom vue mode is used if provided', async () => {
    await runSpectron({ mode: 'expected' })

    // Mode argument was set to expected
    expect(
      execa.mock.calls[0][1].join(' ').indexOf('--mode expected')
    ).not.toBe(-1)
  })

  test('returns stdout of command', async () => {
    const { stdout } = await runSpectron({}, { customLog: 'shouldBeInLog' })
    // Mock stdout is included
    expect(stdout.indexOf('shouldBeInLog')).not.toBe(-1)
  })
})
