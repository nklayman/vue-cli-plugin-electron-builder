const lnk = require('lnk')
const fs = require('fs-extra')
// Prevent full and unnecessary project creation
process.env.VUE_CLI_TEST = true
// Link ./ to node_modules/vcp-electron-builder so that require.resolve(vcp-electron-builder) returns ./
if (!fs.existsSync('./node_modules/vue-cli-plugin-electron-builder')) {
  try {
    lnk.sync(['./'], './node_modules/vue-cli-plugin-electron-builder')
  } catch (err) {
    if (err.code !== 'EEXIST') console.error(err)
  }
}
// Create project dir if it doesn't exist
if (!fs.existsSync('./__tests__/projects')) {
  try {
    fs.mkdirSync('./__tests__/projects')
  } catch (err) {
    if (err.code !== 'EEXIST') console.error(err)
  }
}
