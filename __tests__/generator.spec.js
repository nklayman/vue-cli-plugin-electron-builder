const generator = require('../generator')
const fs = require('fs')
jest.mock('fs')

// Mock the generator api
let completionCb
const mockApi = {
  render: jest.fn(),
  onCreateComplete: jest.fn(cb => {
    completionCb = cb
  }),
  extendPackage: jest.fn(),
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
  // Only index should have been read/written
  expect(fs.writeFileSync).toHaveBeenCalledTimes(1)
  expect(fs.readFileSync).toHaveBeenCalledTimes(1)
})
