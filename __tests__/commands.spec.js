const pluginIndex = require('../index.js')
const testWithSpectron = pluginIndex.testWithSpectron
const Config = require('webpack-chain')
const webpack = require('webpack')
const builder = require('electron-builder')
const fs = require('fs-extra')
const execa = require('execa')
const portfinder = require('portfinder')
const Application = require('spectron').Application
jest.mock('fs-extra')
jest.mock('electron-builder')
const mockExeca = {
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  kill: jest.fn()
}
jest.mock('execa', () => jest.fn(() => mockExeca))
jest.mock('electron-builder', () => ({ build: jest.fn().mockResolvedValue() }))
const mockWait = jest.fn(() => new Promise(resolve => resolve()))
const mockStart = jest.fn()
jest.mock('spectron', () => ({
  Application: jest.fn().mockImplementation(() => ({
    start: mockStart,
    client: { waitUntilWindowLoaded: mockWait }
  }))
}))
const buildRenderer = jest.fn().mockResolvedValue()
const serve = jest.fn().mockResolvedValue({ url: 'serveUrl' })
console.log = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})
const runCommand = async (command, options = {}, args = {}) => {
  if (!args._) args._ = []
  const renderConfig = new Config()
  //   Command expects define plugin to exist
  renderConfig
    .plugin('define')
    .use(webpack.DefinePlugin, [{ 'process.env': {} }])
  let commands = {}
  const api = {
    //   Make app think typescript plugin is installed
    hasPlugin: jest.fn().mockReturnValue(true),
    resolveChainableWebpackConfig: jest.fn(() => renderConfig),
    registerCommand: jest.fn().mockImplementation((name, options, command) => {
      commands[name] = command
    }),
    resolve: jest.fn(path => 'projectPath/' + path),
    service: {
      run: jest.fn(
        (command, ...args) =>
          command === 'serve' ? serve(args) : buildRenderer(args)
      )
    }
  }
  pluginIndex(api, options)
  await commands[command](args, [])
}

describe('build:electron', () => {
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

  test('custom output dir is used if provided', async () => {
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
    //   Render build output is correct
    expect(buildRenderer.mock.calls[0][0][0].dest).toBe('output/bundled')
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
            config.node.set('test', 'expected')
            return config
          }
        }
      }
    })
    const mainConfig = webpack.mock.calls[0][0]
    // Custom node key is passed through
    expect(mainConfig.node.test).toBe('expected')
  })

  test('Custom renderer process webpack config is used if provided', async () => {
    await runCommand('build:electron', {
      pluginOptions: {
        electronBuilder: {
          chainWebpackRendererProcess: config => {
            config.node.set('test', 'expected')
            return config
          }
        }
      }
    })
    const rendererConfig = buildRenderer.mock.calls[0][0][2][0].toConfig()
    // Custom node key is passed through
    expect(rendererConfig.node.test).toBe('expected')
  })

  test('Custom main process webpack config is used if provided', async () => {
    await runCommand('build:electron', {
      pluginOptions: {
        electronBuilder: {
          builderOptions: {
            testOption: 'expected'
          }
        }
      }
    })
    // Custom electron-builder config is used
    expect(builder.build.mock.calls[0][0].config.testOption).toBe('expected')
  })

  test('Fonts folder is copied to css if it exists', async () => {
    //   Mock existence of fonts folder
    fs.existsSync.mockReturnValueOnce(true)
    await runCommand('build:electron')
    // css/fonts folder was created
    expect(fs.mkdirSync.mock.calls[0][0]).toBe(
      'projectPath/dist_electron/bundled/css/fonts'
    )
    // fonts was copied to css/fonts
    expect(fs.copySync.mock.calls[0][0]).toBe(
      'projectPath/dist_electron/bundled/fonts'
    )
    expect(fs.copySync.mock.calls[0][1]).toBe(
      'projectPath/dist_electron/bundled/css/fonts'
    )
  })
  test('.js and .ts are merged into file extensions', async () => {
    await runCommand('build:electron')

    const mainConfig = webpack.mock.calls[0][0]
    // Both .js and .ts are resolved
    expect(mainConfig.resolve.extensions).toEqual(['.js', '.ts'])
  })
})

describe('serve:electron', () => {
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

  test('custom output dir is used if provided', async () => {
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
            config.node.set('test', 'expected')
            return config
          }
        }
      }
    })
    const mainConfig = webpack.mock.calls[0][0]
    // Custom node key is passed through
    expect(mainConfig.node.test).toBe('expected')
  })

  test('Custom renderer process webpack config is used if provided', async () => {
    await runCommand('serve:electron', {
      pluginOptions: {
        electronBuilder: {
          chainWebpackRendererProcess: config => {
            config.node.set('test', 'expected')
            return config
          }
        }
      }
    })
    const rendererConfig = serve.mock.calls[0][0][2][0].toConfig()
    // Custom node key is passed through
    expect(rendererConfig.node.test).toBe('expected')
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
    process.exit = jest.fn()
    let watchCb
    fs.watchFile.mockImplementation((file, cb) => {
      // Set callback to be called later
      watchCb = cb
    })
    await runCommand('serve:electron', {
      pluginOptions: {
        electronBuilder: {
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
    // Proper url is returned
    expect(url).toBe('http://localhost:1234/')
    const appArgs = Application.mock.calls[0][0]
    // Spectron is launched with proper path to background
    expect(appArgs.args).toEqual(['customOutput/background.js'])
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
    expect(stdout.indexOf('shouldBeInLog')).not.toBe(-1)
  })
})
