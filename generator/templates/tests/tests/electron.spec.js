import { testWithPlaywright } from 'vue-cli-plugin-electron-builder'
import { expect, test } from '@playwright/test'
test.setTimeout(60000)

test.describe('Window Loads Properly', async () => {
  let app, stop, win, browserWindow

  test.beforeAll(async () => {
    // Wait for dev server to start
    const { app: _app, stop: _stop } = await testWithPlaywright()
    app = _app
    stop = _stop
    win = await app.firstWindow()
    browserWindow = await app.browserWindow(win)
  })

  test.afterAll(async () => {
    if (app) {
      return await stop()
    }
  })

  test('Window count is one', () => {
    expect(app.windows().length).toBe(1)
  })

  test('Window is not minimized', async () => {
    const isMinimized = await browserWindow.evaluate((browserWindow) => { return browserWindow.isMinimized() })
    expect(isMinimized).toBe(false)
  })

  test('Window is visible', async () => {
    const isVisible = await browserWindow.evaluate((browserWindow) => { return browserWindow.isVisible() })
    expect(isVisible).toBe(true)
  })

  test('Window bounds are correct', async () => {
    const { height, width } = await browserWindow.evaluate((browserWindow) => { return { ...browserWindow.getBounds() } })
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })

  test('Content is shown', async () => {
    const innerHTML = await (await win.waitForSelector('#app')).innerHTML()
    expect(innerHTML).toMatch(/Welcome to Your Vue\.js (\+ TypeScript )?App/)
  })
})
