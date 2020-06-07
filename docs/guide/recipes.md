# Recipes

## Table Of Contents

[[toc]]

## Icons

> Customize your app's launcher and tray icon

[Example Repo](https://github.com/nklayman/electron-icon-example)

#### Install Required Deps

First, add [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) as a `devDependency`:

With Yarn:

`yarn add --dev electron-icon-builder`

or with NPM:

`npm install --save-dev electron-icon-builder`

#### Add Icon to App

Place your square icon in `public/icon.png`.

#### Add Generation Script

Add the following script to your `package.json`:

```json
"electron:generate-icons": "electron-icon-builder --input=./public/icon.png --output=build --flatten"
```

#### Generate Icons

Run the new script:

With Yarn:

`yarn electron:generate-icons`

or with NPM:

`npm run electron:generate-icons`

#### Set Tray Icon

Edit your background file (`src/background.(js|ts)` by default):

```js
// Import path module (at the top of your file, below 'use-strict')
import path from 'path'

// Replace
win = new BrowserWindow({ width: 800, height: 600 })
// With
win = new BrowserWindow({
  width: 800,
  height: 600,
  icon: path.join(__static, 'icon.png')
})
```

:::tip
If you get the linting error `'__static' is not defined`, add `/* global __static */` in your background file above your imports.
:::

## Multiple Pages <badge text="v1.1.1+" type="info" />

> Create multiple Electron windows for each [page](https://cli.vuejs.org/config/#pages)

[Example Repo](https://github.com/nklayman/electron-multipage-example)

#### Add Your Pages

Follow [Vue CLI's instructions](https://cli.vuejs.org/config/#pages) for adding pages to your app.

#### Create Variable for Second Page

Add the `secondWin` and `createdAppProtocol` variables to your background file (`src/background.(js|ts)` by default):

```js
// Already in file
let win
// Add these below
let secondWin
let createdAppProtocol = false
```

#### Accept Page Arguments for `createWindow` Function

In your background file, update the `createWindow` function to take arguments about the page:

Replace:

```js
function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({ width: 800, height: 600 })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  win.on('closed', () => {
    win = null
  })
}
```

With:

```js
function createWindow(winVar, devPath, prodPath) {
  // Create the browser window.
  winVar = new BrowserWindow({ width: 800, height: 600 })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    winVar.loadURL(process.env.WEBPACK_DEV_SERVER_URL + devPath)
    if (!process.env.IS_TEST) winVar.webContents.openDevTools()
  } else {
    if (!createdAppProtocol) {
      createProtocol('app')
      createdAppProtocol = true
    }
    // Load the index.html when not in development
    winVar.loadURL(`app://./${prodPath}`)
  }

  winVar.on('closed', () => {
    winVar = null
  })
}
```

#### Create Both Windows on App Launch

Create both windows inside the `app.on('ready')` callback in your background file:

```js
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installVueDevtools()
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  // Replace
  createWindow()
  // With
  createWindow(win, '', 'index.html')
  createWindow(secondWin, 'subpage', 'subpage.html')
})
```

#### Recreate Both Windows When Dock Icon is Clicked

Create both windows inside the `app.on('activate')` callback in your background file:

```js
app.on('activate', () => {
// On macOS it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.

// Replace
if (win === null) {
  createWindw()
}
// With
if (win === null) {
  createWindow(win, '', 'index.html')
}
if (secondWin === null) {
  createWindow(secondWin, 'subpage', 'subpage.html')
}
```

## Debugging With VSCode

> Debug the Main and Renderer process with [Visual Studio Code](https://code.visualstudio.com/)

[Example Repo](https://github.com/nklayman/electron-vscode-debug-example)

Read [Visual Studio Code's docs on debugging](https://code.visualstudio.com/docs/editor/debugging) before following this guide.

#### Enable Sourcemaps

Enable sourcemaps in your `vue.config.js`:

```js
module.exports = {
  configureWebpack: {
    devtool: 'source-map'
  }
}
```

#### Add Debug Task

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

#### Add Debugging Configurations

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

#### Add Some Breakpoints

Add "red dot" [breakpoints](https://code.visualstudio.com/docs/editor/debugging#_breakpoints) by clicking VSCode's gutter in your Vue app or background file.

#### Launch Debug Mode

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

`npm electron:build -- --linux deb --win nsis` (Do not remove the extra double dashes)

Using yarn:

`yarn electron:build --linux deb --win nsis`
