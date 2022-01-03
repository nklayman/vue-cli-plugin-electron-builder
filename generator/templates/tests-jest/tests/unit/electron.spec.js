/**
 * @jest-environment node
 */
import { testWithPlaywright } from 'vue-cli-plugin-electron-builder'
jest.setTimeout(50000)

test('Window Loads Properly', async () => {
  // Wait for dev server to start
  const { app, stop } = await testWithPlaywright()
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  // Window was created
  expect(app.windows().length).toBe(1)
  // App is loaded properly
  expect(
    /Welcome to Your Vue\.js (\+ TypeScript )?App/.test(
      await win.innerText('#app')
    )
  ).toBe(true)

  await stop()
})
