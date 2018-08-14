---
sidebarDepth: 2
---

# Guide

## Handling static assets

### Renderer process (main app)

In the renderer process, static assets work similarly to a regular app. Read Vue CLI's documentation [here](https://cli.vuejs.org/guide/html-and-static-assets.html) before continuing. However, there are a few changes made:

-   The `__static` global variable is added. It provides a path to your public directory in both development and production. Use this to read/write files in your app's public directory.
-   In production, the `process.env.BASE_URL` is replaced with the path to your app's files.

**Note: `__static` is not available in regular build/serve. It should only be used in electron to read/write files on disk. To import a file (img, script, etc...) and not have it be transpiled by webpack, use the `process.env.BASE_URL` instead.**

### Main process (background.js)

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
│ ├── background.js  # compiled background file used for serve:electron
│ └── ...
├── public/  # Files placed here will be avalible through __static or process.env.BASE_URL
├── src/
│ ├── background.[js|ts]  # electron entry file (for Electron's main process)
│ ├── [main|index].[js|ts]  # your app's entry file (for Electron's render process)
│ └── ...
├── package.json  # your app's package.json file
├── ...
```

## How it works

### Build command

The build command consists of three main phases: render build, main build, and electron-builder build:

1.  Render build: This phase calls `vue-cli-service build` with some custom configuration so it works properly with electron. (The render process is your standard app.)
2.  Main build: This phase is where vue-cli-plugin-electron-builder bundles your background file for the main process (`src/background.js`).
3.  Electron-builder build: This phase uses [electron-builder](https://www.electron.build) to turn your web app code into an desktop app powered by [Electron](https://electronjs.org).

### Serve command

The serve command also consists of 3 main phases: main build, dev server launch, and electron launch:

1.  Dev server launch: This phase starts the built in dev server with a few modifications to work properly with electron.
2.  Main build: This phase, like in the build command, bundles your app's main process, but in development mode.
3.  Electron launch: This phase launches electron and tells it to load the url of the above dev server.

## Is this plugin production ready?

This plugin is nearly production ready. It has test coverage for everything but the UI interface and proper logging of errors. It needs to be used a little bit more in large applications before it is considered safe to use in a large production environment. Please try it in your app and report any bugs or feature requests.
