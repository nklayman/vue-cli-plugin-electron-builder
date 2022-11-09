jest.setTimeout(100000)

const runTests = require('./testWithPlaywright.helper.js')

test('testWithPlaywright works with Mocha', async () => {
  await runTests('mocha')
})
