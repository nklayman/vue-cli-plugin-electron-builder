import electron, { remote } from 'electron'
import fs from 'fs'
import path from 'path'

import downloadChromeExtension from './downloadChromeExtension'
import { getPath } from './utils'

const { BrowserWindow } = remote || electron

let IDMap = {}
const IDMapPath = path.resolve(getPath(), 'IDMap.json')
if (fs.existsSync(IDMapPath)) {
  try {
    IDMap = JSON.parse(fs.readFileSync(IDMapPath, 'utf8'))
  } catch (err) {
    console.error(
      'electron-devtools-installer: Invalid JSON present in the IDMap file'
    )
  }
}

const install = (forceDownload = false) => {
  return new Promise(resolve => {
    const chromeStoreID = 'nhdogjmejiglipccpnnnanhbledajbpd'
    const extensionName = IDMap[chromeStoreID]
    const extensionInstalled =
      extensionName &&
      BrowserWindow.getDevToolsExtensions &&
      BrowserWindow.getDevToolsExtensions()[extensionName]
    if (!forceDownload && extensionInstalled) {
      return Promise.resolve(IDMap[chromeStoreID])
    }
    downloadChromeExtension(chromeStoreID, forceDownload).then(
      extensionFolder => {
        // Use forceDownload, but already installed
        if (extensionInstalled) {
          BrowserWindow.removeDevToolsExtension(extensionName)
        }
        const name = BrowserWindow.addDevToolsExtension(extensionFolder) // eslint-disable-line
        fs.writeFileSync(
          IDMapPath,
          JSON.stringify(
            Object.assign(IDMap, {
              [chromeStoreID]: name
            })
          )
        )
        resolve(extensionFolder)
      }
    )
  })
}

export default install
