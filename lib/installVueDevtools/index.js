import electron, { remote } from 'electron'
import fs from 'fs'
import path from 'path'

import downloadChromeExtension from './downloadChromeExtension'
import { getPath } from './utils'

const { BrowserWindow } = remote || electron

let IDMap = {}
const getIDMapPath = () => path.resolve(getPath(), 'IDMap.json')
if (fs.existsSync(getIDMapPath())) {
  try {
    IDMap = JSON.parse(fs.readFileSync(getIDMapPath(), 'utf8'))
  } catch (err) {
    console.error(
      'electron-devtools-installer: Invalid JSON present in the IDMap file'
    )
  }
}

const install = (forceDownload = false) => {
  console.log(
    'installVueDevtools() is deprecated, and will be removed in a future release.'
  )
  console.log('Please use electron-devtools-installer instead.')
  console.log(
    'See https://github.com/nklayman/vue-cli-plugin-electron-builder/releases/tag/v2.0.0-rc.4 for details.'
  )
  // return new Promise(resolve => {
  const chromeStoreID = 'nhdogjmejiglipccpnnnanhbledajbpd'
  const extensionName = IDMap[chromeStoreID]
  const extensionInstalled =
    extensionName &&
    BrowserWindow.getDevToolsExtensions &&
    BrowserWindow.getDevToolsExtensions()[extensionName]
  if (!forceDownload && extensionInstalled) {
    return Promise.resolve(IDMap[chromeStoreID])
  }
  return downloadChromeExtension(chromeStoreID, forceDownload).then(
    (extensionFolder) => {
      // Use forceDownload, but already installed
      if (extensionInstalled) {
        BrowserWindow.removeDevToolsExtension(extensionName)
      }
      const name = BrowserWindow.addDevToolsExtension(extensionFolder) // eslint-disable-line
      fs.writeFileSync(
        getIDMapPath(),
        JSON.stringify(
          Object.assign(IDMap, {
            [chromeStoreID]: name
          })
        )
      )
      return Promise.resolve(name)
    }
  )
  // })
}

export default install
