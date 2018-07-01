const builder = jest.genMockFromModule('electron-builder')
builder.build = jest.fn(
  () =>
    new Promise(resolve => {
      resolve()
    })
)
module.exports = builder
