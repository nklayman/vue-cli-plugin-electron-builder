const isWin = process.platform === 'win32'
jest.setTimeout(isWin ? 30000 : 15000)

const createPlaywrightProject = require('./testWithPlaywright.helper.js')

test('testWithPlayWright project created', async () => {
  await createPlaywrightProject()
})
