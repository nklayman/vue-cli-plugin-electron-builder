# Vue CLI Plugin Electron Builder

A Vue Cli 3 plugin for Electron with no required configuration that uses [Electron Builder](https://www.electron.build/) and [Electron Webpack](https://webpack.electron.build/).

**IMPORTANT: Your app must be created with Vue-CLI 3 (vue create my-app), will not work with Vue-CLI 2 (vue init webpack my-app)!**

**IMPORTANT: This plugin only works with @vue/cli-service@3.0.0-beta.10 or greater, not with beta.9 or lower. Set @vue/cli-service to ^3.0.0-beta.10 in the devDependencies of your package.json if build/serve:electron fails. If you still need beta.9 support, use v0.2.5 of vue-cli-plugin-electron-builder.**

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

With yarn:

`yarn build:electron`

or with NPM:

`npm run build:electron`

### Folder Structure:

```
├── dist/ # where electron-webpack outputs compiled files (this will overwrite normal build files)
│ └── ...
├── dist_electron/
│ ├── [target platform]-unpacked # unpacked Electron app (main exe and supporting files)
│ ├── [application name] setup [version].[target binary (exe|dmg|rpm...)] # installer for Electron app
│ └── ...
├── src/
│ ├─── main/
│ │ └── [main|index].[js|ts] # Electron entry file (for Electron's main process)
│ ├── [main|index].[js|ts] # your app's entry file (for Electron's render process)
│ └── ...
├── electron-builder.[json|yml] # electron-builder configuration options (can also be placed in package.json under the "build" key)
├── electron-webpack.[json|yml] # electron-webpack configuration options (can also be placed in package.json under the "electronWebpack" key)
├── package.json # your app's package.json file
├── ...
```

## Further Configuration:

Initial configuration is already set for you in your app's package.json, but if you want to modify it:

### CLI Options:

When building your app, any arguments will be passed to electron-builder. To pass an argument/arguments to electron-webpack, place them after --webpack.

**Example:**

`yarn build:electron [electron-builder options] --webpack [electron-webpack options]`

### Electron Builder:

To see available options, check out [Electron Builder Configuration Options](https://www.electron.build/configuration/configuration)

As per Electron Builder's documentation, they can be applied:

> * in the `package.json` file of your project using the `build` key on the top level:
>
> ```
>  "build": {
>    "appId": "com.example.app"
>  }
> ```
>
> * or through the `--config <path/to/yml-or-json5-or-toml>` option (defaults to `electron-builder.yml`(or `json`, or [json5](http://json5.org/), or [toml](https://github.com/toml-lang/toml))).
>
> ```
>  appId: "com.example.app"
> ```
>
> If you want to use [toml](https://en.wikipedia.org/wiki/TOML), please install `yarn add toml --dev`.
>
> Most of the options accept `null` — for example, to explicitly set that DMG icon must be default volume icon from the OS and default rules must be not applied (i.e. use application icon as DMG icon), set `dmg.icon` to `null`

### Electron Webpack:

To see available options, check out [Electron Webpack Configuration Options](https://webpack.electron.build/configuration)

As per Electron Webpack's documentation, they can be applied:

> in `package.json` at `electronWebpack` or in a separate `electron-webpack.(json|json5|yml)`.

To modify the webpack config for the electron render process only, use the webpackConfig object under vue-cli-plugin-electron-builder's plugin options in `vue.config.js`. To modify for the main process, use the webpackMainConfig object.

```javascript
// vue.config.js

module.exports = {
  configureWebpack: {
    // Non-electron build/serve configuration
    // Aliases will be automatically copied from standard config to electron render config
  },
  pluginOptions: {
    electronBuilder: {
      webpackConfig: {
        // your webpack config for electron render process
      },
      webpackMainConfig: {
        // your webpack config for electron main procees
      }
    }
  }
};
```

#### Adding TypeScript Support:

When you invoke/add vue-cli-plugin-electron-builder, it will ask you if you use TypeScript and configure accordingly. However, if you answered no and decide to add TypeScript later on, you must install electron-webpack-ts@1.4.0: `yarn add electron-webpack-ts@1.4.0 --dev` (or with NPM: `npm install --save-dev electron-webpack-ts@1.4.0`).
