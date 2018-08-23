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
  // Reset mock status
  jest.clearAllMocks()
})

test('extends gitignore if it exists', () => {
  fs.readFileSync.mockImplementation((path, encoding) => {
    // Check that utf8 encoding is set
    expect(encoding).toBe('utf8')
    if (path === 'apiResolve_./package.json') {
      return JSON.stringify({ scripts: {} })
    }
    // return mock content
    return 'existing_content'
  })
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
    'existing_content\n#Electron-builder output\n/dist_electron'
  )
  expect(fs.readFileSync).not.toBeCalledWith('apiResolve_./.gitignore', 'utf8')
  // Only index should have been written
  expect(fs.writeFileSync).toHaveBeenCalledTimes(1)
})

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
