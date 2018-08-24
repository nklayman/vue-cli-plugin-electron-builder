---
sidebarDepth: 2
---

# Configuration

## Table of Contents

[[toc]]

## Configuring Electron Builder

To see available options, check out [Electron Builder Configuration Options](https://www.electron.build/configuration/configuration)

They can be placed under the `builderOptions` key in vue-cli-plugin-electron-builder's plugin options in `vue.config.js`

```javascript
// vue.config.js

module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        // options placed here will be merged with default configuration and passed to electron-builder
      }
    }
  }
}
```

:::tip
All CLI arguments passed to `build:electron` will be forwarded to electron-builder.
:::

## Webpack Configuration

Your regular config is extended and used for bundling the renderer process (your app). To modify your webpack config for Electron builds only, use the `chainWebpackRendererProcess` function. To modify the webpack config for the [Electron main process](https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes) only, use the `chainWebpackMainProcess` function under VCP Electron Builder's plugin options in `vue.config.js`. To learn more about webpack chaining, see [webpack-chain](https://github.com/mozilla-neutrino/webpack-chain). These functions work similarly to the [`chainWebpack`](https://cli.vuejs.org/config/#chainwebpack) option provided by Vue CLI.

**Note: Do NOT change the webpack output directory for the main process! See changing output directory below for more info. To change the entry point for the main process, use the `mainProcessFile` key, DO NOT modify it in through chaining.**

```javascript
// vue.config.js

module.exports = {
  configureWebpack: {
    // Configuration applied to all builds
  },
  pluginOptions: {
    electronBuilder: {
      chainWebpackMainProcess: config => {
        // Chain webpack config for electron main process only
      },
      chainWebpackRendererProcess: config => {
        // Chain webpack config for electron renderer process only
        // The following example will set IS_ELECTRON to true in your app
        config.plugin('define').tap(args => {
          args[0]['IS_ELECTRON'] = true
          return args
        })
      },
      // Use this to change the entrypoint of your app's main process
      mainProcessFile: 'src/myBackgroundFile.js',
      // Provide an array of files that, when changed, will recompile the main process and restart Electron
      // Your main process file will be added by default
      mainProcessWatch: ['src/myFile1', 'src/myFile2']
    }
  }
}
```

## Changing the Output Directory

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
}
```

## TypeScript Options

Typescript support is automatic and requires no configuration, just add the `@vue/typescript` cli plugin. There are a few options for configuring typescript if necessary:

```javascript
// vue.config.js

module.exports = {
  pluginOptions: {
    electronBuilder: {
      // option: default // description
      disableMainProcessTypescript: false, // Manually disable typescript plugin for main process. Enable if you want to use regular js for the main process (src/background.js by default).
      mainProcessTypeChecking: false // Manually enable type checking during webpck bundling for background file.
    }
  }
}
```

:::tip Tip <Badge text="1.0.0-rc.1+" type="info"/>
If you decide to add the `@vue/typescript` plugin to your app later on, make sure to re-invoke the generator of VCP-Electron-Builder with `vue invoke electron-builder`. This will automatically insert missing type definitions to your `background.ts` file.
:::