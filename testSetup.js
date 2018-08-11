const lnk = require('lnk')
const fs = require('fs-extra')
// Prevent full and unnecessary project creation
process.env.VUE_CLI_TEST = true
// Link ./ to node_modules/vcp-electron-builder to that require.resolve(vcp-electron-builder) returns ./
// fs.removeSync('./node_modules/vue-cli-plugin-electron-builder')
if (!fs.existsSync('./node_modules/vue-cli-plugin-electron-builder')) {
  try {
    lnk.sync(['./'], './node_modules/vue-cli-plugin-electron-builder')
  } catch (err) {
    if (err.code !== 'EEXIST') console.error(err)
  }
}
// Create project dir if it doesn't exist
if (!fs.existsSync('./__tests__/projects')) {
  fs.mkdirSync('./__tests__/projects')
}
