import { testWithPlaywright } from 'vue-cli-plugin-electron-builder'
import { expect, test } from '@playwright/test'
test.setTimeout(600000)

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
  expect(await (await win.waitForSelector('#app')).innerHTML()
  ).toMatch(/Welcome to Your Vue\.js (\+ TypeScript )?App/)

  await stop()
})
