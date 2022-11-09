/**
 * @jest-environment node
 */
import { testWithPlaywright } from 'vue-cli-plugin-electron-builder'
jest.setTimeout(50000)

test('Window Loads Properly', async () => {
  // Wait for dev server to start
  const { app, stop } = await testWithPlaywright()
  const win = await app.firstWindow()
  const browserWindow = await app.browserWindow(win)
  const {
    isMinimized,
    isVisible,
    height,
    width
  } = await browserWindow.evaluate((browserWindow) => {
    return {
      isMinimized: browserWindow.isMinimized(),
      isVisible: browserWindow.isVisible(),
      ...browserWindow.getBounds()
    }
  })

  // Window was created
  expect(app.windows().length).toBe(1)
  // It is not minimized
  expect(isMinimized).toBe(false)
  // Window is visible
  expect(isVisible).toBe(true)
  // Size is correct
  expect(width).toBeGreaterThan(0)
  expect(height).toBeGreaterThan(0)
  // App is loaded properly
  expect(
    /Welcome to Your Vue\.js (\+ TypeScript )?App/.test(
      await (await win.$('#app')).innerHTML()
    )
  ).toBe(true)

  await stop()
})
