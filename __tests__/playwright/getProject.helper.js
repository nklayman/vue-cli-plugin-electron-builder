import path from 'path'
import fs from 'fs-extra'
import execa from 'execa'

module.exports = function getProject (name, projectRoot) {
  const read = file => {
    return fs.readFile(path.resolve(projectRoot, file), 'utf-8')
  }

  const has = file => {
    return fs.existsSync(path.resolve(projectRoot, file))
  }

  if (!has(projectRoot)) {
    console.error(`An existing test project does not exists for ${name}.`)
  }

  const write = (file, content) => {
    const targetPath = path.resolve(projectRoot, file)
    const dir = path.dirname(targetPath)
    return fs.ensureDir(dir).then(() => fs.writeFile(targetPath, content))
  }

  const rm = file => {
    return fs.remove(path.resolve(projectRoot, file))
  }

  const run = (command, args) => {
    [command, ...args] = command.split(/\s+/)
    if (command === 'vue-cli-service') {
      // appveyor has problem with paths sometimes
      command = require.resolve('@vue/cli-service/bin/vue-cli-service')
    }
    return execa(command, args, { cwd: projectRoot })
  }

  return {
    dir: projectRoot,
    has,
    read,
    write,
    run,
    rm
  }
}
