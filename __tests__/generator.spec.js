const generator = require('../generator')
const fs = require('fs')
jest.mock('fs')

// Mock the generator api
let pkg = {}
let completionCb
const mockApi = {
  render: jest.fn(),
  onCreateComplete: jest.fn(cb => {
    completionCb = cb
  }),
  extendPackage: jest.fn(newPkg => {
    pkg = newPkg
  }),
  // Make sure api.resolve(path) is used
  resolve: jest.fn(path => 'apiResolve_' + path),
  hasPlugin: jest.fn()
}
beforeEach(() => {
  fs.readFileSync.mockImplementation((path, encoding) => {
    // Check that utf8 encoding is set
    expect(encoding).toBe('utf8')
    if (path === 'apiResolve_./package.json') {
      return JSON.stringify({ scripts: {} })
    }
    // return mock content
    return 'existing_content'
  })
  // Reset mock status
  jest.clearAllMocks()
})

describe('.gitignore', () => {
  test('extends gitignore if it exists', () => {
    // Mock existence of .gitignore
    fs.existsSync = jest.fn(path => path === 'apiResolve_./.gitignore')
    // Run the generator with mock api
    generator(mockApi)
    // Run the onCreateComplete callback
    completionCb()
    // New .gitignore should have been written
    expect(fs.writeFileSync).toBeCalledWith(
      'apiResolve_./.gitignore',
      'existing_content\n#Electron-builder output\n/dist_electron'
    )
  })

  test("doesn't modify .gitignore if it doesn't exist", () => {
    // Mock lack of .gitignore
    fs.existsSync = jest.fn(path => !(path === 'apiResolve_./.gitignore'))
    // Run the generator with mock api
    generator(mockApi)
    // Run the onCreateComplete callback
    completionCb()
    // New .gitignore should not have been read from or written
    expect(fs.writeFileSync).not.toBeCalledWith(
      'apiResolve_./.gitignore',
      expect.any(String)
    )
    expect(fs.readFileSync).not.toBeCalledWith(
      'apiResolve_./.gitignore',
      expect.any(String)
    )
    // Nothing should have been written
    expect(fs.writeFileSync).toHaveBeenCalledTimes(0)
  })

  test.each(['#Electron-builder output', '/dist_electron'])(
    'does not modify .gitignore if it has "%s"',
    existing => {
      fs.readFileSync.mockImplementation((path, encoding) => {
        // Check that utf8 encoding is set
        expect(encoding).toBe('utf8')
        if (path === 'apiResolve_./package.json') {
          return JSON.stringify({ scripts: {} })
        }
        // return mock content
        return `ignore-this\n${existing}\nignore-that`
      })

      // Mock existence of .gitignore
      fs.existsSync = jest.fn(path => path === 'apiResolve_./.gitignore')
      // Run the generator with mock api
      generator(mockApi)
      // Run the onCreateComplete callback
      completionCb()
      // New .gitignore should not have been written
      expect(fs.writeFileSync).not.toBeCalledWith(
        'apiResolve_./.gitignore',
        expect.any(String)
      )
      // Nothing should have been written
      expect(fs.writeFileSync).toHaveBeenCalledTimes(0)
    }
  )
})

describe('background.js', () => {
  test.each([false, true])(
    'Background file is not added if it exists',
    usesTS => {
      const file = `src/background.${usesTS ? 'ts' : 'js'}`
      // Mock having typescript
      mockApi.hasPlugin.mockImplementationOnce(
        plugin => plugin === 'typescript' && usesTS
      )
      // Mock existence of background file
      fs.existsSync.mockImplementation(path => path === `apiResolve_./${file}`)
      generator(mockApi)
      completionCb()
      expect(mockApi.render).not.toBeCalled()
    }
  )

  test.each([
    '(process.env.WEBPACK_DEV_SERVER_URL as string)',
    'let mainWindow: any'
  ])('Types are not re-added for "%s"', background => {
    // Mock typescript existence
    mockApi.hasPlugin.mockImplementationOnce(plugin => plugin === 'typescript')
    // Mock background file existence
    fs.existsSync.mockImplementation(
      file => file === 'apiResolve_./src/background.js'
    )
    fs.readFileSync.mockImplementation((path, encoding) => {
      // Check that utf8 encoding is set
      expect(encoding).toBe('utf8')
      // Mock existing postinstall script in app's package.json
      if (path === 'apiResolve_./package.json') {
        return JSON.stringify({
          scripts: {}
        })
      }
      // return mock content
      return background
    })
    generator(mockApi)
    completionCb()
    expect(fs.writeFileSync).toBeCalledWith(
      'apiResolve_./src/background.ts',
      background
    )
  })
})

describe('package.json', () => {
  test('Adds electron-builder install-app-deps to postInstall', () => {
    generator(mockApi)
    completionCb()
    expect(pkg.scripts.postinstall).toBe('electron-builder install-app-deps')
  })

  test('Adds on to existing postinstall script instead of replacing', () => {
    fs.readFileSync.mockImplementation((path, encoding) => {
      // Check that utf8 encoding is set
      expect(encoding).toBe('utf8')
      // Mock existing postinstall script in app's package.json
      if (path === 'apiResolve_./package.json') {
        return JSON.stringify({
          scripts: { postinstall: 'existingTask' }
        })
      }
      // return mock content
      return 'existing_content'
    })

    generator(mockApi)
    completionCb()

    expect(pkg.scripts.postinstall).toBe(
      'existingTask && electron-builder install-app-deps'
    )
  })

  test('Does not add install-app-deps multiple times', () => {
    fs.readFileSync.mockImplementation((path, encoding) => {
      // Check that utf8 encoding is set
      expect(encoding).toBe('utf8')
      // Mock existing postinstall script in app's package.json
      if (path === 'apiResolve_./package.json') {
        return JSON.stringify({
          scripts: {
            postinstall: 'existingTask && electron-builder install-app-deps'
          }
        })
      }
      // return mock content
      return 'existing_content'
    })

    generator(mockApi)
    completionCb()

    expect(pkg.scripts.postinstall).toBe(
      'existingTask && electron-builder install-app-deps'
    )
  })
})
