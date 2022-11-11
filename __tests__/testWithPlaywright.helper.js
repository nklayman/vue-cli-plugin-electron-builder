const createProject = require('./createProject.helper.js')
// const execa = require('execa')
// const path = require('path')

module.exports = async () => {
  const plugins = {}
  await createProject(
    'playwright',
    false,
    plugins
  )
}
