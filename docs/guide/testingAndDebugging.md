---
sidebarDepth: 2
---

# Testing and Debugging

## Debugging

### Visual Studio Code

See the [VSCode debugging recipe](./recipes.md#debugging-with-vscode) for information on debugging the main and renderer process in [Visual Studio Code](https://code.visualstudio.com/).

### Renderer Process (Main App)

You can debug the renderer process using [Vue Devtools](https://github.com/vuejs/vue-devtools). Vue Devtools are automatically installed for you (powered by [electron-devtools-installer](https://github.com/MarshallOfSound/electron-devtools-installer)). You can also use the [Chrome debugger](https://developers.google.com/web/tools/chrome-devtools/javascript/).

### Main Process (Background File)

First, read [Electron's instructions](https://electronjs.org/docs/tutorial/debugging-main-process) for debugging the main process. Before launching Electron through your debugger, run `electron:serve` in debug mode with the `--debug` argument. This will prevent Electron from launching automatically and enable source map support. Have Electron target your output directory (`dist_electron` by default) by passing it as an argument (ie `electron --inspect=5858 dist_electron`).

::: tip
If you are testing with [Playwright](https://github.com/microsoft/playwright), make sure to set `process.env.IS_TEST` to `true`. This will prevent dev tools from being loaded which may result in inconsistent test results.
:::

## Testing

:::tip
If you don't want to use Playwright, you can still use this function, just set `noPlaywright` to `true`
:::

Before continuing, read about [PlayWright](https://github.com/microsoft/playwright). This guide assumes basic knowledge about using Playwright.

vue-cli-plugin-electron-builder exports a `testWithPlaywright` function. This function will run `electron:serve`, but instead of launching electron, a new Playwright Application will be created and attached to the dev server. This can be used to run e2e tests with Playwright.

```js
// This example uses the Playwright test runner. The electron feature of Playwright, doesn't run well outside the Playwright runner.
import { testWithPlaywright } from 'vue-cli-plugin-electron-builder'
import { expect, test } from '@playwright/test'
test.setTimeout(60000)

test('Window Loads Properly', async () => {

  // Wait for dev server to start
  const { app, stop } = await testWithPlaywright()
  // Wait for first window
  const win =  await app.firstWindow()

  // Window count needs to be one
  expect(app.windows().length).toBe(1)

  // Window bounds are correct
  const { height, width } = await browserWindow.evaluate((browserWindow) => { return { ...browserWindow.getBounds() } })
  expect(width).toBeGreaterThan(0)
  expect(height).toBeGreaterThan(0)

  await stop()
})
```

An complete example with Playwright runner is available [here](https://github.com/nklayman/vue-cli-plugin-electron-builder/blob/playwright/generator/templates/tests/tests/electron.spec.js). It will be automatically added with this plugin if you have select to add tests.

`testWithPlaywright` takes a config argument. That config argument has properties as defined:

```js
const { testWithPlaywright } = require('vue-cli-plugin-electron-builder')

testWithPlaywright(
  {
    noPlaywright: false, // Disables launching of Playwright. Enable this if you want to launch Playwright yourself.
    forceDev: false, // Run dev server in development mode. By default it is run in production (serve --mode production).
    mode: 'test', // Set custom Vue env mode.
    launchOptions: {} // Custom options to be passed to Playwright. Defaults are already set, only use this if you need something customized.
})
```
