# Vue CLI Plugin Electron Builder

A Vue Cli 3 plugin for Electron with no required configuration that uses [Electron Builder](https://www.electron.build/) and [Electron Webpack](https://webpack.electron.build/).
**IMPORTANT: Your app must be created with Vue-CLI 3 (vue create my-app), will not work with Vue-CLI 2 (vue init webpack my-app)**

## Quick Start:

Open a terminal in the directory of your app created with Vue-CLI 3
Then, install and invoke the generator of vue-cli-plugin-electron-builder by running:

    vue add electron-builder

That's It! Your ready to go!

### To start a development server:

If you use [Yarn](https://yarnpkg.com/en/) (strongly recommended):

    yarn serve:electron

or if you use NPM:

    npm run serve:electron

### To build your app:

With yarn:

    yarn build:electron

or with NPM:

    npm run build:electron

## Further Configuration:

### CLI Options

When building your app, any arguments will be passed to electron-builder. To pass an argument/arguments to electron-webpack, place them after --webpack.

**Example:**

    yarn build:electron [electron-builder options] --webpack [electron-webpack options]

### Configuration Files:

Initial configuration is already set for you in your app's package.json, but it you want to modify it:

### Electron Builder:

To see avalible options, check out [Electron Builder Configuration Options](https://www.electron.build/configuration/configuration)

As per Electron Builder's documentation, they can be applied:

> * in the `package.json` file of your project using the `build` key on the top level:
>
>
> ```
>  "build": {
>    "appId": "com.example.app"
>  }
> ```
>
> * or through the `--config <path/to/yml-or-json5-or-toml>` option (defaults to `electron-builder.yml`(or `json`, or [json5](http://json5.org/), or [toml](https://github.com/toml-lang/toml))).
>
>
> ```
>  appId: "com.example.app"
> ```
>
> If you want to use [toml](https://en.wikipedia.org/wiki/TOML), please install `yarn add toml --dev`.
>
> Most of the options accept `null` — for example, to explicitly set that DMG icon must be default volume icon from the OS and default rules must be not applied (i.e. use application icon as DMG icon), set `dmg.icon` to `null`

### Electron Webpack:

To see avalible options, check out [Electron Webpack Configuration Options](https://webpack.electron.build/configuration)

As per Electron Webpack's documentation, they can be applied:

> Configurations can be applied in `package.json` at `electronWebpack` or in a separate `electron-webpack.(json|json5|yml)`.
