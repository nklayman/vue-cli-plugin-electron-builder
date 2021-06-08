---
sidebarDepth: 2
---

# Guide

## Table Of Contents

[[toc]]

## Native Modules

Native modules are supported and should work without any configuration, assuming [nodeIntegration is enabled](./configuration.md#node-integration). If you get errors, you may need to set the native dependency as an [webpack external](https://webpack.js.org/configuration/externals/). It should get found automatically, but it might not. To do this, use the `externals` option:

```javascript
// vue.config.js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      // List native deps here if they don't work
      externals: ['my-native-dep'],
      // If you are using Yarn Workspaces, you may have multiple node_modules folders
      // List them all here so that VCP Electron Builder can find them
      nodeModulesPath: ['../../node_modules', './node_modules']
    }
  }
}
```

### Notes

- You can prefix an item in the `externals` array with `!` to prevent it being automatically marked as an external. (`!not-external`)

- If you do not use native dependencies in your code, you can remove the `postinstall` and `postuninstall` scripts from your `package.json`. Native modules may not work, but dependency install times will be faster.

- Using a database such as MySQL or MongoDB requires extra configuration. See [Issue #76 (comment)](https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/76#issuecomment-420060179) for more info.

## Handling Static Assets

Static assets work the same as a regular web app. Read Vue CLI's documentation [here](https://cli.vuejs.org/guide/html-and-static-assets.html#static-assets-handling) for more information.

<!-- prettier-ignore -->
:::tip __static
Available only in Electron, the global variable `__static` is added to the main and renderer process. It is set to the path of your public folder on disk. This is useful if you need to use Node APIs on the file, such as`fs.readFileSync`or`child_process.spawn`. Note that files in the public folder are read-only in production as they are packaged into a `.asar` archive. If you need files to be writeable, use [electron-builder's extraResources config](https://www.electron.build/configuration/contents#extraresources).
:::

:::tip Videos
By default, videos will fail to load from the public folder. There are two solutions to this problem. If you are using Electron 11+, simply add `stream: true` to the privileges config on line 10 of your main process file (`background.(js|ts)` by default): `{ scheme: 'app', privileges: { secure: true, standard: true, stream: true } }`. If you do not want to use Electron 11+, you will have to configure and use the `local-resource` protocol, see [these docs](./security.html#loading-local-images-resources) for instructions, and [this GitHub issue](https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/872) for more details.
:::

### Examples:

```vue
<!-- To load an image that will be processed by webpack -->
<img src="./assets/logo.png">
<!-- To load an image from the `public` folder which webpack will not process, just copy -->
<!-- imgPath should equal `path.join(process.env.BASE_URL, 'logo.png')` -->
<img :src="imgPath">
<script>
// Only works in electron serve/build
// Will not work in renderer process unless you enable nodeIntegration
// Expects myText.txt to be placed in public folder

const fs = require('fs')
const path = require('path')

const fileLocation = path.join(__static, 'myText.txt')
const fileContents = fs.readFileSync(fileLocation, 'utf8')

console.log(fileContents)
</script>
```

## Preload Files

Preload files allow you to execute JS with [Node integration](/guide/configuration.html#node-integration) in the context of your Vue App (shared `window` variable). Create a preload file and update your `vue.config.js` as so:

```js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      preload: 'src/preload.js',
      // Or, for multiple preload files:
      preload: { preload: 'src/preload.js', otherPreload: 'src/preload2.js' }
    }
  }
}
```

Then, update the `new BrowserWindow` call in your main process file (`src/background.(js|ts)` by default) to include the preload option:

```diff
const win = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    // Use pluginOptions.nodeIntegration, leave this alone
    // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/configuration.html#node-integration for more info
    nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
+   preload: path.join(__dirname, 'preload.js')
  }
})
```

You will need to rerun `electron:serve` for the changes to take effect.

## Folder Structure

```
├── dist_electron/
│ ├── bundled/..  # where webpack outputs compiled files
│ ├── [target platform]-unpacked/..  # unpacked Electron app (main app and supporting files)
│ ├── [application name] setup [version].[target binary (exe|dmg|rpm...)]  # installer for Electron app
│ ├── index.js  # compiled background file used for electron:serve
│ └── ...
├── public/  # Files placed here will be available through __static or process.env.BASE_URL
├── src/
│ ├── background.[js|ts]  # electron entry file (for Electron's main process)
│ ├── [main|index].[js|ts]  # your app's entry file (for Electron's render process)
│ └── ...
├── package.json  # your app's package.json file
├── ...
```

## Env Variables

Read [Vue ClI's documentation](https://cli.vuejs.org/guide/mode-and-env.html) to learn about using environment variables in your app. All env variables prefixed with `VUE_APP_` will be available in both the main and renderer processes.

## Web Workers

[Worker-plugin](https://github.com/GoogleChromeLabs/worker-plugin) will work out of the box for Electron and web. Install it, then add the following to your `vue.config.js`:

```js
const WorkerPlugin = require('worker-plugin')

module.exports = {
  configureWebpack: {
    plugins: [new WorkerPlugin()]
  }
}
```

Now, create a worker like so:

```js
new Worker('./worker.js', { type: 'module' })
```
## Using Yarn Workspaces

If you are using [Yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) you need to set `nodeModulesPath` to include both the package node_modules, and the workspace node_modules.

You should also move your eslint config to the workspace root or you'll get lots of weird messages.

This is becuase yarn workspaces 'hoists' shared dependencies to the top level and this plugin needs to be able to scan your node_modules to check for binary depdendencies to externalize.

For example, with this directory structure:
```
packages/
  app/
  components/
```
Inside `packages/app/vue.config.js` add the following line to the plugin config:

```
module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeModulesPath: ['./node_modules', '../../node_modules'],
      ...
    }
  }
}
```


## How it works

### Build Command

The build command consists of three main phases: render build, main build, and electron-builder build:

1.  Render build: This phase calls `vue-cli-service build` with some custom configuration so it works properly with electron. (The render process is your standard app.)
2.  Main build: This phase is where VCP-Electron-Builder bundles your background file for the main process (`src/background.js`).
3.  Electron-builder build: This phase uses [electron-builder](https://www.electron.build) to turn your web app code into an desktop app powered by [Electron](https://electronjs.org).

### Serve Command

The serve command also consists of 3 main phases: main build, dev server launch, and electron launch:

1.  Dev server launch: This phase starts the built in dev server with a few modifications to work properly with electron.
2.  Main build: This phase, like in the build command, bundles your app's main process, but in development mode.
3.  Electron launch: This phase launches electron and tells it to load the url of the above dev server.

## Is This Plugin Production Ready?

This plugin is ready for use in a production environment. It has complete e2e and unit test coverage, and has been used in many apps, large and small alike. However, no code is immune to bugs and if you do find one, please report it so that it can be fixed.
