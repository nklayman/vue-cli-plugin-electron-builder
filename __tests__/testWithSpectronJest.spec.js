jest.setTimeout(100000)

const runTests = require('./testWithSpectron.helper.js')

test('testWithSpectron works with Jest', async () => {
  await runTests('jest')
})
