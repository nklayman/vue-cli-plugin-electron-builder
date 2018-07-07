---
sidebarDepth: 2
---

## Configuration

### Configuring Electron Builder

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

### Webpack configuration

Your regular config is used for bundling the renderer process (your app). To modify the webpack config for the electron main process only, use the `chainWebpackMainProcess` function under vue-cli-plugin-electron-builder's plugin options in `vue.config.js`. Use `chainWebpackRendererProcess` customize your app's webpack config for Electron builds only. To learn more about webpack chaining, see [webpack-chain](https://github.com/mozilla-neutrino/webpack-chain). The function should take a config argument, modify it through webpack-chain, and then return it.

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
        rendererConfig.plugin('define').tap(args => {
          args[0]['IS_ELECTRON'] = true
          return args
        })
      },
      // Use this to change the entrypoint of your app's main process
      mainProcessFile: 'src/myBackgroundFile.js'
    }
  }
}
```

### Changing the output directory

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

### TypeScript Options

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

:::tip
If you are adding typescript after vue-cli-plugin-electron-builder, you may also want to set `mainWindow`'s type to `any` and change `process.env.WEBPACK_DEV_SERVER_URL` to `process.env.WEBPACK_DEV_SERVER_URL as string` to fix type errors. If you add typescript first, this will be done automatically.
:::

### Using Vue Modes (.env Vars)

Before continuing, read the Vue CLI's [documentation on modes](https://cli.vuejs.org/guide/mode-and-env.html). To use modes in VCP Electron Builder, you have 2 options.

1.  Pass the `--mode` command line argument to either `build:electron` or `serve:electron` (`yarn serve:electron --mode myMode`)

2.  Set `serveMode` and `buildMode` in VCP Electron Builder's plugin options.

```javascript
// vue.config.js

module.exports = {
  pluginOptions: {
    electronBuilder: {
      serveMode: 'development',
      buildMode: 'production'
    }
  }
}
```
