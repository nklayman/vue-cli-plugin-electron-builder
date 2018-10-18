---
sidebarDepth: 2
---

# Common Issues

## Blank screen on builds, but works fine on serve

This issue is likely caused when vue-router is operating in `history` mode. Disable history mode like so:

```javascript
// src/router.js or src/router/index.js
// ...
export default new Router({
  mode: 'hash' // instead of "mode: 'history'"
  // ...
})
// ...
```

## `electron:serve` freezes on `Launching Electron...`

Often this issue is caused when Vue Devtools fails to install. This may happen if Vue Devtools cannot be accessed in your location (eg. China). To fix this, you may have to disable Vue Devtools by removing the following lines from your `src/background.(js|ts)` file:

```javascript
if (isDevelopment && !process.env.IS_TEST) {
  // Install Vue Devtools
  await installVueDevtools()
}
```

## Strict mime-type error when running a built app

This is likely caused because you are missing code in your `public/index.html` file. To add it, simply run `vue invoke electron-builder`. This will re-invoke the generator of VCP Electron Builder. Any missing code will be detected and added automatically. If you would not like to re-invoke the generator, you can paste this code into the top of the `<head>` of your `public/index.html`:

```html
<% if (BASE_URL === './') { %><base href="app://./" /><% } %>
```

## Other issues

Many issues can be solved by re-invoking the generator of Vue CLI Plugin Electron Builder. This allows it to add newer code to your project files. You may need to do this after upgrading the plugin.

```shell
# In the root dir of your project
vue invoke electron-builder
```
