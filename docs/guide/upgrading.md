# Upgrading

::: warning Note
This guide is for upgrading from <=v0.3.2 to >=v1.0.0.
:::

## Steps

1.  Re-invoke the generator for vue-cli-plugin-electron-builder by running `vue invoke electron-builder`. Make sure to update the package before running.
2.  You may delete `src/main/index.js`. If you have modified it, those modifications must be moved to `src/background.js` after re-invoking the generator.
3.  You may delete any electron-webpack config options, they will not be used. By default, they are in `package.json` under `electronWebpack`. Instead, your regular app's config is extended.
4.  You may delete any electron-builderconfig options, they will not be used. By default, they are in `package.json` under `build`. Any changes that you have made to these must be [moved to plugin options](./configuration.md#configuring-electron-builder).
5.  You may remove `webpackConfig` and `webpackMainConfig` from vue-cli-plugin-electron-builder's plugin options. Webpack config for the renderer process is your normal webpack config, and you can use the `chainWebpackMainProcess` function to customize the main process webpack config. If you need to customize the renderer process, use the `chainWebackRendererProcess` function ([guide](./configuration.md#webpack-configuration)).
6.  You may remove `electron-webpack`, `electron-builder`, and, if used, `electron-webpack-ts` from your devDependencies. You may also remove `source-map-support` from your dependencies.

## What has changed

- Electron-webpack is no longer used. Instead, your app is built as normal (but with some slight configuration changes).
- This means there is no need to change your config to work with stylus, sass, or any other special files.
- Typescript support is [automatic](./configuration.md#typescript-options) for both processes, just add the `@vue/typescript` plugin.
- Your normal build will not be overwritten by `build:electron`.
- The [folder structure](./guide.md#folder-structure) has changed dramatically.
- Electron-builder's [config](./configuration.md#configuring-electron-builder) is now taken from the `builderConfig` key in vue-cli-plugin-electron-builder's plugin options.
- To learn more about the internals of this plugin, see [how it works](./guide.md#how-it-works).
