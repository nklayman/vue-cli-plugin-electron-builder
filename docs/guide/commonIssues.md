---
sidebarDepth: 2
---

# Common Issues

## Blank screen on builds, but works fine on serve

This issue is likely caused when Vue Router is operating in `history` mode. In Electron, it only works in `hash` mode. To fix this, edit your `src/router.(js|ts)`:

If using Vue 2:

```diff
export default new Router({
- mode: 'history',
+ mode: process.env.IS_ELECTRON ? 'hash' : 'history',
})
```

If using Vue 3:

```diff
const router = createRouter({
- history: createWebHistory(),
  // (you will need to import these functions from 'vue-router')
+ history: process.env.IS_ELECTRON ? createWebHashHistory() : createWebHistory(),
})
```

This will have the router operate in hash mode in Electron builds, but won't affect web builds.

## `electron:serve` freezes on `Launching Electron...`

Often this issue is caused when Vue Devtools fails to install. This may happen if Vue Devtools cannot be accessed in your location (eg. China). To fix this, you may have to disable Vue Devtools by removing the following lines from your `src/background.(js|ts)` file:

```javascript
if (isDevelopment && !process.env.IS_TEST) {
  // Install Vue Devtools
  await installExtension(VUEJS_DEVTOOLS)
}
```

## Exceptions in `async` functions not getting logged to console

This bug can be fixed by adding the following code to the entrypoint of your Vue App `src/main.js`:

```javascript
process.on('unhandledRejection', (error) => {
  console.error(error)
})
```

See [#118](https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/118) for more details. Thanks to [dspangenberg](https://github.com/dspangenberg) for the fix.

## Other issues

Many issues can be solved by re-invoking the generator of Vue CLI Plugin Electron Builder. This allows it to add newer code to your project files. You may need to do this after upgrading the plugin.

```bash
# In the root dir of your project
vue invoke electron-builder
```
