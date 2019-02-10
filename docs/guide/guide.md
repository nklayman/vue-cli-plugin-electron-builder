---
sidebarDepth: 2
---

# Guide

## Table Of Contents

[[toc]]

## Native Modules <Badge text="1.0.0-rc.1+" type="warn"/>

Native modules are supported and should work without any configuration. If you get errors, first make sure VCP-Electron-Builder's version is set to `1.0.0-rc.1` or greater. If it still fails, re-invoke the generator with `vue invoke electron-builder`. The generator will automatically detect missing code (such as native module support) and add it, without interfering with the rest. If you have done both these things, you may need to set the native dependency as an [webpack external](https://webpack.js.org/configuration/externals/). It should get found automatically, but it might not. To do this, use the `externals` option:

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

::: tip

You can prefix an item in the `externals` array with `!` to prevent it being automatically marked as an external. (`!not-external`)

:::

::: tip

If you do not use native dependencies in your code, you can remove the `postinstall` script from your `package.json`. Native modules may not work, but dependency install times will be faster.

:::

## Handling Static Assets

### Renderer Process (Main App)

In the renderer process, static assets work similarly to a regular app. Read Vue CLI's documentation [here](https://cli.vuejs.org/guide/html-and-static-assets.html) before continuing. However, there are a few changes made:

- The `__static` global variable is added. It provides a path to your public directory in both development and production. Use this to read/write files in your app's public directory.
- In production, the `process.env.BASE_URL` is replaced with the path to your app's files.

**Note: `__static` is not available in regular build/serve. It should only be used in electron to read/write files on disk. To import a file (img, script, etc...) and not have it be transpiled by webpack, use the `process.env.BASE_URL` instead.**

### Main Process (`background.js`)

The main process won't have access to `process.env.BASE_URL` or `src/assets`. However, you can still use `__static` to get a path to your public directory in development and production.

### Examples:

```vue
<!-- Renderer process only -->
<!-- This image will be processed by webpack and placed under img/ -->
<img src="./assets/logo.png">
<!-- Renderer process only -->
<!-- This image will no be processed by webpack, just copied-->
<!-- imgPath should equal `path.join(process.env.BASE_URL, 'logo.png')` -->
<img :src="imgPath">
<!-- Both renderer and main process -->
<!-- This will read the contents of public/myText.txt -->
<script>
const fs = require('fs')
const path = require('path')

// Expects myText.txt to be placed in public folder
const fileLocation = path.join(__static, 'myText.txt')
const fileContents = fs.readFileSync(fileLocation, 'utf8')

console.log(fileContents)
</script>
```

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

Read [Vue ClI's documentation](https://cli.vuejs.org/guide/mode-and-env.html) to learn about using environment variables in your app. All env variables prefixed with `VUE_APP_` will be available in both the main and renderer processes (Only available in main process since `1.0.0-rc.4`).

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
