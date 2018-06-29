const lnk = require('lnk')
const fs = require('fs-extra')
const rimraf = require('rimraf')
// Prevent full and unnecessary project creation
process.env.VUE_CLI_TEST = true
// Link ./ to node_modules/vcp-electron-builder to that require.resolve(vcp-electron-builder) returns ./
fs.removeSync('./node_modules/vue-cli-plugin-electron-builder')
lnk.sync(['./'], './node_modules/vue-cli-plugin-electron-builder')
// Create project dir if it doesn't exist, clear it if it does
if (fs.existsSync('./__tests__/projects')) {
  rimraf.sync('./__tests__/projects/*')
} else {
  fs.mkdirSync('./__tests__/projects')
}
