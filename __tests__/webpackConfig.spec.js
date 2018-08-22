const { chainWebpack } = require('../lib/webpackConfig')
const Config = require('webpack-chain')
const webpack = require('webpack')
const fs = require('fs')

// Set for Electron builds
process.env.IS_ELECTRON = true

// Mock plugin api
const mockApi = {
  resolve: jest.fn(path => {
    // Mock api.resolve paths for tests
    if (path.match(/\.\/node_modules$/)) {
      return 'nodeModulesPath'
    } else if (path.match(/^.\/package.json/)) {
      return '../__tests__/mock_package.json'
    } else if (path.match('./node_modules/mockExternal/package.json')) {
      return 'mockExternalPath'
    } else if (path.match('./node_modules/mockExternal/index.js')) {
      return 'mockExternalIndex'
    }
  })
}

const mockChain = (pluginOptions = {}, definePlugin = true) => {
  const config = new Config()
  if (definePlugin) {
    // Expects plugin to already exist
    config.plugin('define').use(webpack.DefinePlugin, [{ 'process.env': {} }])
  }
  chainWebpack(mockApi, pluginOptions, config)
  return config
}

afterEach(() => {
  // Reset environment
  process.env.IS_ELECTRON = true
  process.env.NODE_ENV = 'production'
  jest.clearAllMocks()
})

describe('chainWebpack', () => {
  test('process.env.VUE_APP_NODE_MODULES_PATH is set to false in non-electron builds', () => {
    // Simulate non-electron build
    delete process.env.IS_ELECTRON
    mockChain()
    expect(process.env.VUE_APP_NODE_MODULES_PATH).toBe('false')
  })

  test('process.env.VUE_APP_NODE_MODULES_PATH is set to false in Electron production builds', () => {
    mockChain()
    expect(process.env.VUE_APP_NODE_MODULES_PATH).toBe('false')
  })

  test('process.env.VUE_APP_NODE_MODULES_PATH is set to projectPath/node_modules in Electron dev', () => {
    // Simulate serve:electron
    process.env.NODE_ENV = 'development'
    mockChain()
    // Is set to project's node_modules folder
    expect(process.env.VUE_APP_NODE_MODULES_PATH).toBe('nodeModulesPath')
  })

  test.each(['production', 'development'])(
    'User configuration is applied in %s',
    env => {
      process.env.NODE_ENV = env
      const config = mockChain({
        // Provide custom chain function
        chainWebpackRendererProcess: config => {
          config.node.set('shouldBe', 'expected')
        }
      })
      // Mock value is set
      expect(config.toConfig().node.shouldBe).toBe('expected')
    }
  )

  test.each(['production', 'development'])(
    'Configuration is not applied in non-electron %s builds',
    env => {
      // Set environment
      process.env.NODE_ENV = env

      // So getExternals would return something
      jest.doMock('./mock_package.json', () => ({
        dependencies: { mockExternal: 'mockExternal' }
      }))
      const { readFileSync: realReadFileSync } = fs
      fs.readFileSync = jest.fn((path, ...args) => {
        if (path === 'mockExternalPath') {
          return JSON.stringify({})
        }
        return realReadFileSync(path, ...args)
      })

      // Simulate non-electron build
      delete process.env.IS_ELECTRON
      const config = mockChain(
        {
          // Provide custom chain function
          chainWebpackRendererProcess: config => {
            config.node.set('shouldBe', 'expected')
          }
        },
        false
      )
      // Config is unchanged
      expect(config.toConfig()).toEqual(new Config().toConfig())
    }
  )
})

describe.each(['production', 'development'])('getExternals in %s', env => {
  process.env.NODE_ENV = env

  const mockGetExternals = async (
    modulePkg = {},
    pluginOptions,
    mockAppPkg = true
  ) => {
    if (mockAppPkg) {
      // Mock app's package.json
      jest.doMock('./mock_package.json', () => ({
        dependencies: { mockExternal: 'mockExternal' }
      }))
    } else {
      // Remove mock
      jest.dontMock('./mock_package.json')
    }

    // Mock dep's package.json
    const { readFileSync: realReadFileSync } = fs
    fs.readFileSync = jest.fn((path, ...args) => {
      if (path === 'mockExternalPath') {
        return JSON.stringify(modulePkg)
      }
      // Don't effect other calls
      return realReadFileSync(path, ...args)
    })

    // Run chainWebpack function
    const config = await mockChain(pluginOptions)
    return config.toConfig()
  }
  const hasExternal = externals => {
    // External is properly added
    expect(externals).toEqual({ mockExternal: 'require("mockExternal")' })
  }

  test('No externals if there are no deps', async () => {
    const { externals } = await mockGetExternals({}, {}, false)
    expect(externals).toBeUndefined()
  })

  test.each(['main', 'module', 'jsnext:main', 'browser'])(
    'If dep has a %s field it should not be an external',
    async field => {
      const { externals } = await mockGetExternals({ [field]: 'somePath.js' })
      expect(externals).toBeUndefined()
    }
  )

  test.each(['gypfile', 'binary'])(
    'If dep has a %s field it should be an external',
    async field => {
      const { externals } = await mockGetExternals({ [field]: 'somePath.js' })
      hasExternal(externals)
    }
  )

  test('If dep has index.js it should not be external', async () => {
    // Mock existence of index.js
    fs.existsSync = jest.fn(file => file === 'mockExternalIndex')
    const { externals } = await mockGetExternals()
    expect(externals).toBeUndefined()
    // Remove mock
    fs.existsSync.mockReset()
  })

  test('If dep is listed in user list it should be an external', async () => {
    const { externals } = await mockGetExternals(
      // Prevent it from getting marked as an external by default
      { main: 'It will not be an external by default', name: 'mockExternal' },
      // Add it to external list
      { externals: ['mockExternal'] }
    )
    hasExternal(externals)
  })

  test('If dep is listed in user list and prefixed with "!" it should not be an external', async () => {
    const { externals } = await mockGetExternals(
      // Make sure it would have been marked as an external by default
      { binary: 'It will be an external by default', name: 'mockExternal' },
      // Add it to user externals whitelist
      { externals: ['!mockExternal'] }
    )
    expect(externals).toBeUndefined()
  })
})
