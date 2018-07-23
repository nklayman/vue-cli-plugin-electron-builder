import fs from 'fs'
import path from 'path'
import rimraf from 'rimraf'
import unzip from 'unzip-crx'

import { getPath, downloadFile, changePermissions } from './utils'

const downloadChromeExtension = (
  chromeStoreID,
  forceDownload,
  attempts = 5
) => {
  const extensionsStore = getPath()
  if (!fs.existsSync(extensionsStore)) {
    fs.mkdirSync(extensionsStore)
  }
  const extensionFolder = path.resolve(`${extensionsStore}/${chromeStoreID}`)
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(extensionFolder) || forceDownload) {
      if (fs.existsSync(extensionFolder)) {
        rimraf.sync(extensionFolder)
      }
      const fileURL = `https://clients2.google.com/service/update2/crx?response=redirect&x=id%3D${chromeStoreID}%26uc&prodversion=32` // eslint-disable-line
      const filePath = path.resolve(`${extensionFolder}.crx`)
      downloadFile(fileURL, filePath)
        .then(() => {
          unzip(filePath, extensionFolder).then(err => {
            if (
              err &&
              !fs.existsSync(path.resolve(extensionFolder, 'manifest.json'))
            ) {
              return reject(err)
            }
            changePermissions(extensionFolder, 755)
            resolve(extensionFolder)
          })
        })
        .catch(err => {
          console.log(
            `Failed to fetch extension, trying ${attempts - 1} more times`
          ) // eslint-disable-line
          if (attempts <= 1) {
            return reject(err)
          }
          setTimeout(() => {
            downloadChromeExtension(chromeStoreID, forceDownload, attempts - 1)
              .then(resolve)
              .catch(reject)
          }, 200)
        })
    } else {
      resolve(extensionFolder)
    }
  })
}

export default downloadChromeExtension
