---
sidebarDepth: 2
---

# Testing and Debugging

## Debugging

### Visual Studio Code

See the [VSCode testing recipe](./recipes.md#debugging-with-vscode) for information on debugging the main and renderer process in [Visual Studio Code](https://code.visualstudio.com/).

### Renderer Process (Main App)

You can debug the renderer process using [Vue Devtools](https://github.com/vuejs/vue-devtools). Vue Devtools are automatically installed for you (powered by [electron-devtools-installer](https://github.com/MarshallOfSound/electron-devtools-installer)). You can also use the [Chrome debugger](https://developers.google.com/web/tools/chrome-devtools/javascript/).

### Main Process (Background File)

First, read [Electron's instructions](https://electronjs.org/docs/tutorial/debugging-main-process) for debugging the main process. Before launching Electron through your debugger, run `electron:serve` in debug mode with the `--debug` argument. This will prevent Electron from launching automatically and enable source map support. Have Electron target your output directory (`dist_electron` by default) by passing it as an argument (ie `electron --inspect=5858 dist_electron`).

::: tip
If you are testing with [Spectron](https://electronjs.org/spectron), make sure to set `process.env.IS_TEST` to `true`. This will prevent dev tools from being loaded which results in errors.
:::

## Testing

:::tip
If you don't want to use Spectron, you can still use this function, just set `noSpectron` to `true`
:::

Before continuing, read about [Spectron](https://github.com/electron/spectron). This guide assumes basic knowledge about using Spectron.

vue-cli-plugin-electron-builder exports a `testWithSpectron` function. This function will run `electron:serve`, but instead of launching electron, a new Spectron Application will be created and attached to the dev server. This can be used to run e2e tests with Spectron.

```javascript
// This example uses Jest, but any testing framework will work as well

const { testWithSpectron } = require('vue-cli-plugin-electron-builder')

test('a window is created', async () => {
  const { stdout, url, stopServe, app } = await testWithSpectron()
  // stdout is the log of electron:serve
  console.log(`electron:serve returned: ${stdout}`)
  // url is the url for the dev server created with electron:serve
  console.log(`the dev server url is: ${url}`)
  // app is a spectron instance. It is attached to the dev server, launched, and waited for to load.
  expect(await app.client.getWindowCount()).toBe(1)
  // Before your tests end, make sure to stop the dev server and spectron
  await stopServe()
})
```

`testWithSpectron` takes a config argument. That config argument has properties as defined:

```javascript
const { testWithSpectron } = require('vue-cli-plugin-electron-builder')

testWithSpectron({
  noSpectron: false // Disables launching of Spectron. Enable this if you want to launch spectron yourself.
  noStart: false // Do not start Spectron app or wait for it to load. You will have to call app.start() and app.client.waitUntilWindowLoaded() before running any tests.
  forceDev: false // Run dev server in development mode. By default it is run in production (serve --mode production).
  mode: 'test', // Set custom Vue env mode.
  spectronOptions: {} // Custom options to be passed to Spectron. Defaults are already set, only use this if you need something customized.
})
```

:::tip Note
DevTools are not opened as `IS_TEST` env variable is set to true. If devtools are opened, Spectron throws an error. See [this issue](https://github.com/electron/spectron/issues/174) for more details.
:::
