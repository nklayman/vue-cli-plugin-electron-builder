jest.setTimeout(100000)

const runTests = require('./testWithSpectron.helper.js')

// Spawned server doesn't exit on windows
// TODO: make this work on windows
;(process.platform === 'win32' ? test.skip : test)(
  'testWithSpectron works with Jest',
  async () => {
    await runTests('jest')
  }
)
