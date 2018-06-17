
# Vue CLI Plugin Electron Builder

A Vue Cli 3 plugin for Electron with no required configuration that uses [Electron Builder](https://www.electron.build/).

**IMPORTANT: Your app must be created with Vue-CLI 3 (vue create my-app), will not work with Vue-CLI 2 (vue init webpack my-app)!**

**IMPORTANT: This is the alpha version of vue-cli-plugin-electron-builder! It is only recommended that you use this if you want to test it out and report bugs, not in production. Check back soon for a beta release.**

**IMPORTANT: If you were previously using an older version of vue-cli-plugin-electron-builder, please see the [upgrade guide](https://github.com/nklayman/vue-cli-plugin-electron-builder/blob/v1-dev/UPGRADING.md).**

## Quick Start:

Open a terminal in the directory of your app created with Vue-CLI 3.

Then, install and invoke the generator of vue-cli-plugin-electron-builder by running:

`vue add electron-builder`

That's It! You're ready to go!

### To start a development server:

If you use [Yarn](https://yarnpkg.com/en/) (strongly recommended):

`yarn serve:electron`

or if you use NPM:

`npm run serve:electron`

### To build your app:

With Yarn:

`yarn build:electron`

or with NPM:

`npm run build:electron`

### Folder Structure:

```
├── dist_electron/
│ ├── bundled/..  # where webpack outputs compiled files
│ ├── [target platform]-unpacked/..  # unpacked Electron app (main app and supporting files)
│ ├── [application name] setup [version].[target binary (exe|dmg|rpm...)]  # installer for Electron app
│ ├── background.js  # compiled background file used for serve:electron
│ └── ...
├── src/
│ ├── background.[js|ts]  # electron entry file (for Electron's main process)
│ ├── [main|index].[js|ts]  # your app's entry file (for Electron's render process)
│ └── ...
├── package.json  # your app's package.json file
├── ...
```

## Configuration:

### Configuring Electron Builder:

To see avalible options, check out [Electron Builder Configuration Options](https://www.electron.build/configuration/configuration)

They can be placed under the `builderOptions` key in vue-cli-plugin-electron-builder's plugin options in `vue.config.js`
```javascript
// vue.config.js

module.exports= {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        // options placed here will be merged with default configuration and passed to electron-builder
      }
    }
  }
}
``` 
### Webpack configuration:
Your regular config is used for bundling the renderer process (your app). To modify the webpack config for the electron main process only, use the `chainWebpackMainProcess` function under vue-cli-plugin-electron-builder's plugin options in `vue.config.js`. To learn more about webpack chaining, see [webpack-chain](https://github.com/mozilla-neutrino/webpack-chain). The function should take a config argument, modify it through webpack-chain, and then return it.

**Note: Do NOT change the webpack output directory for the main process! See changing output directory below for more info. To change the entry point for the main process, use the `mainProcessFile` key, DO NOT modify it in through chaining.**

```javascript
// vue.config.js

module.exports = {
  configureWebpack: {
    // Configuration applied to all builds
  },
  pluginOptions: {
    electronBuilder: {
      chainWebpackMainProcess: (config) => {
        // Chain webpack config for electron main process only
      },
      mainProcessFile: 'src/myBackgroundFile.js'
    }
  }
};
```

### Changing the output directory:
If you don't want your files outputted into dist_electron, you can choose a custom folder in vue-cli-plugin-electron-builder's plugin options.
**Note: after changing this, you MUST update the main field of your `package.json` to `[new dir]/bundled/background.js`. It is also recommended to add the new directory to your .gitignore file.**
```javascript
// vue.config.js

module.exports = {
  pluginOptions: {
    electronBuilder: {
      outputDir: 'electron-builder-output-dir'
    }
  }
};
```
### Adding TypeScript Support:
Typescript support is automatic and requires no configuration, just add the `@vue/typescript` cli plugin. There are a few options for configuring typescript if necessary:

```javascript
// vue.config.js

module.exports = {
  pluginOptions: {
    electronBuilder: {
      disableMainProcessTypescript: false, // Manually disable typescript plugin for main process. Enable if you want to use regular js for the main process (src/background.js by default).
      mainProcessTypeChecking: false // Manually enable type checking during webpck bundling for background file.
    }
  }
};
```
You may also want to set `mainWindow`'s type to `any` and change `process.env.WEBPACK_DEV_SERVER_URL` to `process.env.WEBPACK_DEV_SERVER_URL  as  string` to fix type errors.

## How it works:
### Build command:
The build command consists of three main phases: render build, main build, and electron-builder build:

 1. Render build: This phase calls `vue-cli-service build` with some custom configuration so it works properly with electron. (The render process is your standard app.)
 2. Main build: This phase is where vue-cli-plugin-electron-builder bundles your background file for the main process (`src/background.js`).
 3. Electron-builder build: This phase uses [electron-builder](https://www.electron.build) to turn your web app code into an desktop app powered by [Electron](https://electronjs.org).

### Serve command:
The serve command also consists of 3 main phases: main build, dev server launch, and electron launch:

 1. Main build: This phase, like in the build command, bundles your app's main process, but in development mode.
 2. Dev server launch: This phase starts the built in dev server with no special arguments, just hosting your app as normal.
 3. Electron launch: This phase launches electron and tells it to load the url of the above dev server.
