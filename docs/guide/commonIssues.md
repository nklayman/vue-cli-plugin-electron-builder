---
sidebarDepth: 2
---

# Common Issues

## Blank screen on builds, but works fine on serve

This issue is likely caused when vue-router is operating in `history` mode. To fix this, add a `mounted` hook to the root Vue component:

```javascript
// src/main.js

new Vue({
  router,
  render: h => h(App),
  mounted() {
    // Prevent blank screen in Electron builds
    this.$router.push('/')
  }
}).$mount('#app')
```

This will fix the Electron build issues, but won't affect web builds.

## `electron:serve` freezes on `Launching Electron...`

Often this issue is caused when Vue Devtools fails to install. This may happen if Vue Devtools cannot be accessed in your location (eg. China). To fix this, you may have to disable Vue Devtools by removing the following lines from your `src/background.(js|ts)` file:

```javascript
if (isDevelopment && !process.env.IS_TEST) {
  // Install Vue Devtools
  await installVueDevtools()
}
```

## Strict mime-type error when running a built app

:::tip Notice
As of v1.0.0-rc.5, this tag is no longer necessary. You can remove it if you wish.
:::

This is likely caused because you are missing code in your `public/index.html` file. To add it, simply run `vue invoke electron-builder`. This will re-invoke the generator of VCP Electron Builder. Any missing code will be detected and added automatically. If you would not like to re-invoke the generator, you can paste this code into the top of the `<head>` of your `public/index.html`:

```html
<% if (BASE_URL === './') { %><base href="app://./" /><% } %>
```

## Exceptions in `async` functions not getting logged to console

This bug can be fixed by adding the following code to the entrypoint of your Vue App `src/main.js`:

```javascript
process.on('unhandledRejection', error => {
  console.error(error)
})
```

See [#118](https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/118) for more details. Thanks to [dspangenberg](https://github.com/dspangenberg) for the fix.

## Other issues

Many issues can be solved by re-invoking the generator of Vue CLI Plugin Electron Builder. This allows it to add newer code to your project files. You may need to do this after upgrading the plugin.

```shell
# In the root dir of your project
vue invoke electron-builder
```
