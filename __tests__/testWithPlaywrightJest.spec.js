jest.setTimeout(100000)

const runTests = require('./testWithPlaywright.helper.js')

// Spawned server doesn't exit on windows
// TODO: make this work on windows
;(process.platform === 'win32' ? test.skip : test)(
  'testWithPlaywright works with Jest',
  async () => {
    await runTests('jest')
  }
)
