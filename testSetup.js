const lnk = require('lnk')
const fs = require('fs-extra')
process.env.VUE_CLI_TEST = true
fs.removeSync('./node_modules/vue-cli-plugin-electron-builder')
lnk.sync(['./'], './node_modules/vue-cli-plugin-electron-builder')
