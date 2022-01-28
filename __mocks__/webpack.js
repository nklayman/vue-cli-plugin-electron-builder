const DefinePlugin = jest.requireActual('webpack').DefinePlugin
const EnvironmentPlugin = jest.requireActual('webpack').EnvironmentPlugin
// Mock webpack function
const webpack = jest.genMockFromModule('webpack')
//  Use unmocked plugins plugins are real
webpack.DefinePlugin = DefinePlugin
webpack.EnvironmentPlugin = EnvironmentPlugin
// Make webpack() return mock run function
const run = jest.fn(callback =>
  callback(null, {
    toString: jest.fn(),
    toJson: jest.fn(),
    hasErrors: jest.fn(() => false),
    hasWarnings: jest.fn(() => false)
  })
)
webpack.mockReturnValue({ run })
// Allow run mock to be accessed in test files
webpack.__run = run
module.exports = webpack
