jest.setTimeout(100000)

const createPlaywrightProject = require('./testWithPlaywright.helper.js')

test('testWithPlayWright project created', async () => {
  await createPlaywrightProject()
})
