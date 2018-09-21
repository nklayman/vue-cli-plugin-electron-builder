// #region Imports
const pluginIndex = require('../index.js')
const testWithSpectron = pluginIndex.testWithSpectron
const webpack = require('webpack')
const builder = require('electron-builder')
const fs = require('fs-extra')
const execa = require('execa')
const portfinder = require('portfinder')
const Application = require('spectron').Application
const { chainWebpack } = require('../lib/webpackConfig')
// #endregion

// #region Mocks
const mockYargsParse = jest.fn()
const mockYargsCommand = jest.fn(() => ({ parse: mockYargsParse }))
jest.mock('yargs', () => ({ command: mockYargsCommand }))
jest.mock('@vue/cli-service/lib/commands/build')
jest.mock('fs-extra')
jest.mock('../lib/removeJunk.js', () => jest.fn(() => 'removeJunk'))
jest.mock('electron-builder')
const mockInstallAppDeps = jest.fn()
jest.mock('electron-builder/out/cli/install-app-deps.js', () => ({
  installAppDeps: mockInstallAppDeps
}))
jest.mock('../lib/webpackConfig.js')
const mockPipe = jest.fn()
const mockExeca = {
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  kill: jest.fn(),
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
// #endregion

// #region runCommand
const serviceRun = jest.fn().mockResolvedValue({ url: 'serveUrl' })
const runCommand = async (command, options = {}, args = {}, rawArgs = []) => {
  if (!args._) args._ = []
  let commands = {}
  const api = {
    //   Make app think typescript plugin is installed
    hasPlugin: jest.fn().mockReturnValue(true),
    registerCommand: jest.fn().mockImplementation((name, options, command) => {
      // Save registered commands
      commands[name] = command
    }),
    // So we can ensure that files were resolved properly
    resolve: jest.fn(path => 'projectPath/' + path),
    chainWebpack: jest.fn(),
    service: {
      // Mock api.service.run('build/serve')
      run: serviceRun
    }
  }
  // Run the plugin, saving it's registered commands
  pluginIndex(api, options)
  // Run the provided command
  await commands[command](args, rawArgs)
}
// #endregion

describe('build:electron', () => {
  process.env.NODE_ENV = 'production'

  test('typescript is disabled when set in options', async () => {
    await runCommand('build:electron', {
      pluginOptions: {
        electronBuilder: {
          disableMainProcessTypescript: true
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    //   Typescript rule is not added
    expect(Object.keys(mainConfig)).not.toContain('module')
    //   Ts files are not resolved
    expect(
      mainConfig.resolve ? mainConfig.resolve.extensions : []
    ).not.toContain('ts')
    //   Proper entry file is used
    expect(mainConfig.entry.background[0]).toBe('projectPath/src/background.js')
  })

  test('custom background file is used if provided', async () => {
    await runCommand('build:electron', {
      pluginOptions: {
        electronBuilder: {
          mainProcessFile: 'customBackground.js'
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    //   Proper entry file is used
    expect(mainConfig.entry.background[0]).toBe(
      'projectPath/customBackground.js'
    )
  })

  test('custom output dir is used if set in vue.config.js', async () => {
    await runCommand('build:electron', {
      pluginOptions: {
        electronBuilder: {
          outputDir: 'output'
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    //   Main config output is correct
    expect(mainConfig.output.path).toBe('projectPath/output/bundled')
    // cli-service build output is correct
    expect(serviceRun.mock.calls[0][1].dest).toBe('output/bundled')
    //   Electron-builder output is correct
    expect(builder.build.mock.calls[0][0].config.directories.output).toBe(
      'output'
    )
  })

  test('custom output dir is used if dest arg is passed', async () => {
    await runCommand('build:electron', {}, { dest: 'output' })

    const mainConfig = webpack.mock.calls[0][0]
    //   Main config output is correct
    expect(mainConfig.output.path).toBe('projectPath/output/bundled')
    // cli-service build output is correct
    expect(serviceRun.mock.calls[0][1].dest).toBe('output/bundled')
    //   Electron-builder output is correct
    expect(builder.build.mock.calls[0][0].config.directories.output).toBe(
      'output'
    )
  })

  test('Custom main process webpack config is used if provided', async () => {
    await runCommand('build:electron', {
      pluginOptions: {
        electronBuilder: {
          chainWebpackMainProcess: config => {
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
    await runCommand('build:electron')
    expect(process.env.IS_ELECTRON).toBe('true')
  })

  test('Custom Electron Builder config is used if provided', async () => {
    await runCommand('build:electron', {
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

  test('Fonts folder is copied to css if it exists', async () => {
    //   Mock existence of fonts folder
    fs.existsSync.mockReturnValueOnce(true)
    await runCommand('build:electron')
    // css/fonts folder was created
    expect(fs.ensureDirSync.mock.calls[1][0]).toBe(
      'projectPath/dist_electron/bundled/css/fonts'
    )
    // fonts was copied to css/fonts
    expect(fs.copySync.mock.calls[1][0]).toBe(
      'projectPath/dist_electron/bundled/fonts'
    )
    expect(fs.copySync.mock.calls[1][1]).toBe(
      'projectPath/dist_electron/bundled/css/fonts'
    )
  })

  test('.js and .ts are merged into file extensions', async () => {
    await runCommand('build:electron')

    const mainConfig = webpack.mock.calls[0][0]
    // Both .js and .ts are resolved
    expect(mainConfig.resolve.extensions).toEqual(['.js', '.ts'])
  })

  test.each([
    ['--mode', 'someMode'],
    ['--legacy'],
    ['--skipBundle'],
    ['--dest', 'output']
  ])('%s argument is removed from electron-builder args', async (...args) => {
    await runCommand('build:electron', {}, {}, ['--keep1', ...args, '--keep2'])
    // Custom args should have been removed, and other args kept
    expect(mockYargsParse).toBeCalledWith(['--keep1', '--keep2'])
    mockYargsParse.mockClear()

    await runCommand('build:electron', {}, {}, [...args, '--keep2'])
    // Custom args should have been removed, and other args kept
    expect(mockYargsParse).toBeCalledWith(['--keep2'])
    mockYargsParse.mockClear()

    await runCommand('build:electron', {}, {}, ['--keep1', ...args])
    // Custom args should have been removed, and other args kept
    expect(mockYargsParse).toBeCalledWith(['--keep1'])
    mockYargsParse.mockClear()

    await runCommand('build:electron', {}, {}, args)
    // Custom args should have been removed
    expect(mockYargsParse).toBeCalledWith([])
    mockYargsParse.mockClear()

    await runCommand('build:electron', {}, {}, ['--keep1', '--keep2'])
    // Nothing should be removed
    expect(mockYargsParse).toBeCalledWith(['--keep1', '--keep2'])
  })

  test('Modern mode is enabled by default', async () => {
    await runCommand('build:electron')
    expect(serviceRun.mock.calls[0][1].modern).toBe(true)
  })

  test('Modern mode is disabled if --legacy arg is passed', async () => {
    await runCommand('build:electron', {}, { legacy: true })
    expect(serviceRun.mock.calls[0][1].modern).toBe(false)
  })

  test('App is not bundled if --skipBundle arg is passed', async () => {
    await runCommand('build:electron', {}, { skipBundle: true })
    expect(serviceRun).not.toBeCalled()
    expect(webpack).not.toBeCalled()
  })

  test('Env vars prefixed with VUE_APP_ are available in main process config', async () => {
    process.env.VUE_APP_TEST = 'expected'
    await runCommand('serve:electron')
    const mainConfig = webpack.mock.calls[0][0]
    // Env var is set correctly
    expect(mainConfig.plugins[1].defaultValues.VUE_APP_TEST).toBe('expected')
  })
})

describe('serve:electron', () => {
  process.env.NODE_ENV = 'development'

  test('typescript is disabled when set in options', async () => {
    await runCommand('serve:electron', {
      pluginOptions: {
        electronBuilder: {
          disableMainProcessTypescript: true
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    //   Typescript rule is not added
    expect(Object.keys(mainConfig)).not.toContain('module')
    //   Ts files are not resolved
    expect(
      mainConfig.resolve ? mainConfig.resolve.extensions : []
    ).not.toContain('ts')
    //   Proper entry file is used
    expect(mainConfig.entry.background[0]).toBe('projectPath/src/background.js')
  })

  test('custom background file is used if provided', async () => {
    await runCommand('serve:electron', {
      pluginOptions: {
        electronBuilder: {
          mainProcessFile: 'customBackground.js'
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    //   Proper entry file is used
    expect(mainConfig.entry.background[0]).toBe(
      'projectPath/customBackground.js'
    )
  })

  test('custom output dir is used if set in vue.config.js', async () => {
    await runCommand('serve:electron', {
      pluginOptions: {
        electronBuilder: {
          outputDir: 'output'
        }
      }
    })

    const mainConfig = webpack.mock.calls[0][0]
    //   Main config output is correct
    expect(mainConfig.output.path).toBe('projectPath/output')
  })

  test('Custom main process webpack config is used if provided', async () => {
    await runCommand('serve:electron', {
      pluginOptions: {
        electronBuilder: {
          chainWebpackMainProcess: config => {
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
    await runCommand('serve:electron')
    expect(process.env.IS_ELECTRON).toBe('true')
  })

  test('If --debug argument is passed, electron is not launched, main process is not minified, and source maps are enabled', async () => {
    await runCommand('serve:electron', {}, { debug: true })
    const mainConfig = webpack.mock.calls[0][0]

    // UglifyJS plugin does not exist
    expect(
      mainConfig.plugins.find(
        p => p.__pluginConstructorName === 'UglifyJsPlugin'
      )
    ).toBeUndefined()
    // Source maps are enabled
    expect(mainConfig.devtool).toBe('source-map')
    // Electron is not launched
    expect(execa).not.toBeCalled()
  })

  test('.js and .ts are merged into file extensions', async () => {
    await runCommand('serve:electron')

    const mainConfig = webpack.mock.calls[0][0]
    // Both .js and .ts are resolved
    expect(mainConfig.resolve.extensions).toEqual(['.js', '.ts'])
  })

  test('Main process is recompiled and Electron is relaunched on main process file change', async () => {
    // So we can make sure it wasn't called
    jest.spyOn(process, 'exit')
    let watchCb
    fs.watchFile.mockImplementation((file, cb) => {
      // Set callback to be called later
      watchCb = cb
    })
    await runCommand('serve:electron', {
      pluginOptions: {
        electronBuilder: {
          // Make sure it watches proper background file
          mainProcessFile: 'customBackground'
        }
      }
    })

    // Proper file is watched
    expect(fs.watchFile.mock.calls[0][0]).toBe('projectPath/customBackground')
    // Child has not yet been killed or unwatched
    expect(mockExeca.kill).not.toBeCalled()
    expect(mockExeca.removeAllListeners).not.toBeCalled()
    // Main process was bundled and Electron was launched initially
    expect(webpack).toHaveBeenCalledTimes(1)
    expect(execa).toHaveBeenCalledTimes(1)

    // Mock change of background file
    watchCb()
    // Electron was killed and listeners removed
    expect(mockExeca.kill).toHaveBeenCalledTimes(1)
    expect(mockExeca.removeAllListeners).toHaveBeenCalledTimes(1)
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
    let watchCb = {}
    fs.watchFile.mockImplementation((file, cb) => {
      // Set callback to be called later
      watchCb[file] = cb
    })
    await runCommand('serve:electron', {
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
    expect(fs.watchFile.mock.calls[0][0]).toBe('projectPath/customBackground')
    expect(fs.watchFile.mock.calls[1][0]).toBe('projectPath/listFile')
    // Child has not yet been killed or unwatched
    expect(mockExeca.kill).not.toBeCalled()
    expect(mockExeca.removeAllListeners).not.toBeCalled()
    // Main process was bundled and Electron was launched initially
    expect(webpack).toHaveBeenCalledTimes(1)
    expect(execa).toHaveBeenCalledTimes(1)

    // Mock change of listed file
    watchCb['projectPath/listFile']()
    // Electron was killed and listeners removed
    expect(mockExeca.kill).toHaveBeenCalledTimes(1)
    expect(mockExeca.removeAllListeners).toHaveBeenCalledTimes(1)
    // Process did not exit on Electron close
    expect(process.exit).not.toBeCalled()
    // Main process file was recompiled
    expect(webpack).toHaveBeenCalledTimes(2)
    // Electron was re-launched
    expect(execa).toHaveBeenCalledTimes(2)

    // Mock change of background file
    watchCb['projectPath/customBackground']()
    // Electron was killed and listeners removed
    expect(mockExeca.kill).toHaveBeenCalledTimes(2)
    expect(mockExeca.removeAllListeners).toHaveBeenCalledTimes(2)
    // Process did not exit on Electron close
    expect(process.exit).not.toBeCalled()
    // Main process file was recompiled
    expect(webpack).toHaveBeenCalledTimes(3)
    // Electron was re-launched
    expect(execa).toHaveBeenCalledTimes(3)
  })

  test('Junk output is stripped from electron child process', async () => {
    await runCommand('serve:electron')

    // Junk is removed
    expect(mockExeca.stderr.pipe).toBeCalledWith('removeJunk')
    expect(mockExeca.stdout.pipe).toBeCalledWith('removeJunk')
    // Output is piped to console
    expect(mockPipe).toBeCalledWith(process.stderr)
    expect(mockPipe).toBeCalledWith(process.stdout)
  })

  test('Junk output is not stripped from electron child process if removeElectronJunk is set to false', async () => {
    await runCommand('serve:electron', {
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
    await runCommand('serve:electron', {
      pluginOptions: { electronBuilder: { outputDir: 'outputDir' } }
    })

    expect(fs.copySync).toBeCalledWith(
      `projectPath/./package.json`,
      'outputDir/package.json'
    )
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
    await runCommand('serve:electron')
    const mainConfig = webpack.mock.calls[0][0]
    // Env var is set correctly
    expect(mainConfig.plugins[1].defaultValues.VUE_APP_TEST).toBe('expected')
  })
})

describe('testWithSpectron', async () => {
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
    const testPromise = testWithSpectron(spectronOptions)
    // Mock console.log from serve:electron
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
