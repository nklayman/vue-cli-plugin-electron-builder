# Recipes

## Table Of Contents

[[toc]]

## Auto Update

> Configure app updates with [electron-builder auto update](https://www.electron.build/auto-update)

[Example Repo](https://github.com/nklayman/electron-auto-update-example)

### Install Required Deps

First, install [electron-updater](https://www.npmjs.com/package/electron-updater):

With Yarn:

`yarn add electron-updater`

or with NPM:

`npm install electron-updater`

### Enable Publishing to GitHub

Add `publish: ['github']` to Electron Builder's config in your `vue.config.js`:

```js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        publish: ['github']
      }
    }
  }
}
```

### Check for Updates in `background.(js|ts)`

Add the following to your main process file (`background.(js|ts)` by default):

```diff
...
+  import { autoUpdater } from "electron-updater"
...

if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
+   autoUpdater.checkForUpdatesAndNotify()
  }
...
```

### GitHub Personal Access Token

**Note:** You will need a GitHub personal access token for this step. To get one, go to [https://github.com/settings/tokens](https://github.com/settings/tokens) and click `Generate new token`.

In order for Electron Builder to upload a release to GitHub, you will need to make your token available by setting the `GH_TOKEN` env variable to your token:

On Linux/MacOS:

`export GH_TOKEN=TOKEN-GOES-HERE`

On Windows:

CMD: `set GH_TOKEN=TOKEN-GOES-HERE`

Powershell: `$env:GH_TOKEN = 'TOKEN-GOES-HERE'`

### Upload Release to GitHub

Now that you have configured everything, tell electron-builder to upload your app to GitHub by running `electron:build` with the `-p always` argument:

With Yarn:

`yarn electron:build -p always`

or with NPM:

`npm run electron:build -- -p always`

### Publish Release

Open your repo in GitHub, and click on the releases tab. You should see a draft of your new version with all the binaries included. Publish this release so users can update to it.

### Check for Updates

Install your app, then run it. You won't get an update notification yet, because this is the latest version. You will have to publish a new version by increasing the `version` field in your `package.json`, then repeating the 3 previous steps. Now, your old app should give you an update notification.

## Icons

> Customize your app's launcher and tray icon

Simply add an `icons/icon.png` file to the [build resources directory](https://www.electron.build/configuration/configuration#configuration) and electron-builder will use it on all platforms. Unless you have manually configured the build resources directory, the icon should go in `build/icons/icon.png`, relative to your app's root.

## Multiple Pages

> Create multiple Electron windows for each [page](https://cli.vuejs.org/config/#pages)

[Example Repo](https://github.com/nklayman/electron-multipage-example)

### Add Your Pages

Follow [Vue CLI's instructions](https://cli.vuejs.org/config/#pages) for adding pages to your app.

### Create Variables for Windows

Add the `win` and `secondWin` variables to your background (`src/background.(js|ts)` by default) file, above the `createWindow` function:

```js
let win
let secondWin
```

### Accept Page Arguments for `createWindow` Function

In your background file, update the `createWindow` function to take arguments about the page:

Replace:

```js
function createWindow() {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
  
  win.on('closed', () => { win = null })
}
```

With:

```js
function createWindow(devPath, prodPath) {
  // Create the browser window.
  let window = new BrowserWindow({ width: 800, height: 600 })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    window.loadURL(process.env.WEBPACK_DEV_SERVER_URL + devPath)
    if (!process.env.IS_TEST) window.webContents.openDevTools()
  } else {
    // Load the index.html when not in development
    window.loadURL(`app://./${prodPath}`)
  }

  window.on('closed', () => { window = null })
  return window
}
```

### Create Both Windows on App Launch

Create both windows inside the `app.on('ready')` callback in your background file:

```js
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  // Replace
  createWindow()
  // With
  if (!process.env.WEBPACK_DEV_SERVER_URL) {
    createProtocol('app')
  }
  win = createWindow('', 'index.html')
  secondWin = createWindow('subpage', 'subpage.html')
})
```

### Recreate Both Windows When Dock Icon is Clicked

Create both windows inside the `app.on('activate')` callback in your background file:

```js
app.on('activate', () => {
// On macOS it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.

// Replace
if (BrowserWindow.getAllWindows().length === 0) createWindow()
// With
if (win === null) {
  win = createWindow('', 'index.html')
}
if (secondWin === null) {
  secondWin = createWindow('subpage', 'subpage.html')
}
```

## Debugging With VSCode

> Debug the Main and Renderer process with [Visual Studio Code](https://code.visualstudio.com/)

[Example Repo](https://github.com/nklayman/electron-vscode-debug-example)

Read [Visual Studio Code's docs on debugging](https://code.visualstudio.com/docs/editor/debugging) before following this guide.

### Enable Sourcemaps

Enable sourcemaps in your `vue.config.js`:

```js
module.exports = {
  configureWebpack: {
    devtool: 'source-map'
  }
}
```

### Add Debug Task

Add the `electron-debug` task to `.vscode/tasks.json`, which will start the Electron dev server in debug mode:

```json
{
  // See https://go.microsoft.com/fwlink/?LinkId=733558
  // for the documentation about the tasks.json format
  "version": "2.0.0",
  "tasks": [
    {
      "label": "electron-debug",
      "type": "process",
      "command": "./node_modules/.bin/vue-cli-service",
      "windows": {
        "command": "./node_modules/.bin/vue-cli-service.cmd"
      },
      "isBackground": true,
      "args": ["electron:serve", "--debug"],
      "problemMatcher": {
        "owner": "custom",
        "pattern": {
          "regexp": ""
        },
        "background": {
          "beginsPattern": "Starting development server\\.\\.\\.",
          "endsPattern": "Not launching electron as debug argument was passed\\."
        }
      }
    }
  ]
}
```

### Add Debugging Configurations

Add `Electron: Main`, `Electron: Renderer`, and `Electron: All` debug configurations to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Electron: Main",
      "type": "node",
      "request": "launch",
      "protocol": "inspector",
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/electron.cmd"
      },
      "preLaunchTask": "electron-debug",
      "args": ["--remote-debugging-port=9223", "./dist_electron"],
      "outFiles": ["${workspaceFolder}/dist_electron/**/*.js"]
    },
    {
      "name": "Electron: Renderer",
      "type": "chrome",
      "request": "attach",
      "port": 9223,
      "urlFilter": "http://localhost:*",
      "timeout": 30000,
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverrides": {
        "webpack:///./src/*": "${webRoot}/*"
      }
    }
  ],
  "compounds": [
    {
      "name": "Electron: All",
      "configurations": ["Electron: Main", "Electron: Renderer"]
    }
  ]
}
```

### Add Some Breakpoints

Add "red dot" [breakpoints](https://code.visualstudio.com/docs/editor/debugging#_breakpoints) by clicking VSCode's gutter in your Vue app or background file.

### Launch Debug Mode

Run the `Electron: All` launch configuration. Execution should stop upon reaching one of your breakpoints, and VSCode will allow you to debug your code.

:::warning
Breakpoints will not be detected in your Vue app during the initial launch of Electron. Reload the window to stop on these breakpoints.
:::

## Multi Platform Build

> To build your app for platforms other than your dev system

By default, electron-builder builds for current platform and architecture. However, you can use the electron-builder CLI to create builds for other platforms ([more info here](https://www.electron.build/multi-platform-build)).

All arguments passed to the `electron:build` command will be forwarded to the electron-builder. Available arguments are [here](https://www.electron.build/cli). To set the platforms to build for, add them as a CLI arg to the `electron:build` command, optionally followed by the installers you want to build for that platform.

#### Example

To build a .deb installer for Linux and a NSIS installer for Windows:

Using npm:

`npm run electron:build -- --linux deb --win nsis` (Do not remove the extra double dashes)

Using yarn:

`yarn electron:build --linux deb --win nsis`
