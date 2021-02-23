# Security

[[toc]]

## Node Integration

As of v2.0 of VCPEB, Electron `nodeIntegration` is disabled by default. This blocks all node APIs such as `require`. This reduces [security risks](https://electronjs.org/docs/tutorial/security#2-do-not-enable-nodejs-integration-for-remote-content), and is a recommended best practice by the Electron team. If you need to use native modules such as `fs` or `sqlite` in the renderer process, you can enable `nodeIntegration` in `vue.config.js`:

```js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true
    }
  }
}
```

:::tip IPC Without Node Integration
You can still use [IPC](https://www.electronjs.org/docs/api/ipc-renderer) without `nodeIntegration`. Just create a [preload script](./guide.html#preload-files) with the following code:

```js
import { ipcRenderer } from 'electron'
window.ipcRenderer = ipcRenderer
```

Now, you can access `ipcRenderer` with `window.ipcRenderer` in your Vue app.

If you want to use IPC without `nodeIntegration` and with `contextIsolation`, use this:

```js
import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel, func) => {
    let validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  }
})
```

Then, you can use `window.ipcRenderer.(send/receive)` in the renderer process.

(Solution from [this StackOverflow answer](https://stackoverflow.com/questions/55164360/with-contextisolation-true-is-it-possible-to-use-ipcrenderer/59675116#59675116))

:::

## Loading Local Images/Resources

If WebSecurity is enabled, you won't be able to load resources from the file system, ie `<img src="file:///path/to/some/image.png"/>`. However, you will still be able to load images and other resources from the `public` folder, see [handling static assets](./guide.html#handling-static-assets). If you need to load resources from outside of the public folder you will have to disable WebSecurity or use a custom protocol. [Disabling WebSecurity is strongly discouraged](https://www.electronjs.org/docs/tutorial/security#5-do-not-disable-websecurity), so you should instead use the following technique to load local resources and keep WebSecurity enabled.

Add the following to your main process file (`background.(js|ts)` by default):

```js
app.on('ready', () => {
  registerLocalResourceProtocol()
  ...
})

function registerLocalResourceProtocol() {
  protocol.registerFileProtocol('local-resource', (request, callback) => {
    const url = request.url.replace(/^local-resource:\/\//, '')
    // Decode URL to prevent errors when loading filenames with UTF-8 chars or chars like "#"
    const decodedUrl = decodeURI(url) // Needed in case URL contains spaces
    try {
      return callback(decodedUrl)
    }
    catch (error) {
      console.error('ERROR: registerLocalResourceProtocol: Could not get file path:', error)
    }
  })
}
```

Then, simply prefix local image urls with `local-resource://`, ie `<img src="local-resource://image.png"/>`
