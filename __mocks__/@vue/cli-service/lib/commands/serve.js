const serve = jest.fn(
  () =>
    new Promise(resolve => {
      resolve({ url: 'serveUrl' })
    })
)
module.exports.serve = serve
