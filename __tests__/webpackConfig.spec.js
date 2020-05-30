const { chainWebpack } = require('../lib/webpackConfig')
const Config = require('webpack-chain')
const webpack = require('webpack')
const fs = require('fs')
jest.mock('fs')
// Set for Electron builds
process.env.IS_ELECTRON = true

// Mock plugin api
const mockApi = {
  resolve: jest.fn(path => {
    // Mock api.resolve paths for tests
    if (path.match(/\.\/node_modules$/)) {
      return 'nodeModulesPath'
    } else if (path.match(/^(\.\/)?package.json/)) {
      return '../__tests__/mock_package.json'
    } else if (path.match('./node_modules/mockExternal/package.json')) {
      return 'mockExternalPath'
    } else if (path.match('customNodeModulesPath/mockExternal/package.json')) {
      return 'customExternalPath'
    } else if (path.match('./node_modules/mockExternal/index.js')) {
      return 'mockExternalIndex'
    }
    return path
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
      fs.readFileSync.mockImplementationOnce((path, ...args) => {
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

  test.each([true, false])(
    'process.env.IS_ELECTRON is set properly',
    async isElectron => {
      // Set build mode (Electron or other)
      if (isElectron) {
        process.env.IS_ELECTRON = true
      } else {
        delete process.env.IS_ELECTRON
      }
      const config = mockChain()
      // Definition is set accordingly
      expect(
        config.plugin('define').toConfig().definitions['process.env']
          .IS_ELECTRON
      )[`toBe${isElectron ? 'Truthy' : 'Falsy'}`]()
    }
  )
})

describe.each(['production', 'development'])('getExternals in %s', env => {
  process.env.NODE_ENV = env

  fs.existsSync.mockImplementation(
    path => path === 'mockExternalPath' || path === 'customExternalPath'
  )

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
      if (path === 'mockExternalPath' || path === 'customExternalPath') {
        return JSON.stringify(modulePkg)
      }
      // Don't effect other calls
      return realReadFileSync(path, ...args)
    })

    // Run chainWebpack function
    // nodeIntegration must be true for externals to be fetched in renderer
    const config = await mockChain({ ...pluginOptions, nodeIntegration: true })
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

  test('If dep is listed in user list it should be an external', async () => {
    const { externals } = await mockGetExternals(
      // Prevent it from getting marked as an external by default
      { main: 'It will not be an external by default', name: 'mockExternal' },
      // Add it to external list
      { externals: ['mockExternal'] }
    )
    hasExternal(externals)
  })

  test('Dep should be found if external includes a child path', async () => {
    const { externals } = await mockGetExternals(
      // Prevent it from getting marked as an external by default
      { main: 'It will not be an external by default', name: 'mockExternal' },
      // Add it to external list
      { externals: ['mockExternal/lib'] }
    )
    // External is properly added
    expect(externals).toEqual({
      'mockExternal/lib': 'require("mockExternal/lib")'
    })
  })

  test('Package names which have a substring in user externals should not be external', async () => {
    // If user sets `express-ws` as an external, `express` should not be external
    const { externals } = await mockGetExternals(
      // Prevent it from getting marked as an external by default
      {
        main: 'It will not be an external by default',
        name: 'mockExternal'
      },
      // Add string that includes package name to external list
      { externals: ['mockExternal-special'] }
    )
    // External is properly added
    expect(externals).toBeUndefined()
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

  test('If multiple deps are listed in user list and prefixed with "!" they should not be external', async () => {
    const { externals } = await mockGetExternals(
      // Make sure it would have been marked as an external by default
      { binary: 'It will be an external by default', name: 'mockExternal' },
      // Add it to user externals whitelist
      { externals: ['!mockExternal2', '!mockExternal'] }
    )
    expect(externals).toBeUndefined()
  })

  test("Dep's package.json is read from nodeModulesPath", async () => {
    await mockGetExternals({}, { nodeModulesPath: 'customNodeModulesPath' })

    // App's package.json is read from custom path
    expect(fs.readFileSync).toBeCalledWith('customExternalPath')
    // Not read from default path
    expect(fs.readFileSync).not.toBeCalledWith('mockExternalPath')
  })

  test('Checks multiple locations for dep package.json', async () => {
    await mockGetExternals(
      {},
      { nodeModulesPath: ['wrongPath', 'customNodeModulesPath'] }
    )
    // Checked both paths
    expect(fs.existsSync).toBeCalledWith('wrongPath/mockExternal/package.json')
    expect(fs.existsSync).toBeCalledWith('customExternalPath')
    // Read from proper path
    expect(fs.readFileSync).toBeCalledWith('customExternalPath')
  })
})
