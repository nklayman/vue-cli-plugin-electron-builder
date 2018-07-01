// jest.enableAutomock()
// jest.unmock('bluebird')
// jest.unmock('once')

const pluginIndex = require('../index.js')
const Config = require('webpack-chain')
const webpack = require('webpack')
const builder = require('electron-builder')
const buildRenderer = require('@vue/cli-service/lib/commands/build').build
const fs = require('fs-extra')
jest.mock('@vue/cli-service/lib/commands/build')
jest.mock('fs-extra')
jest.mock('electron-builder')
console.log = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

const runCommand = async (command, options = {}, args = { _: [] }) => {
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
    resolve: jest.fn(path => 'projectPath/' + path)
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
    expect(buildRenderer.mock.calls[0][0].dest).toBe('output/bundled')
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
})
