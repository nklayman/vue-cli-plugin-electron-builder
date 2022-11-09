import testWithPlaywright from 'vue-cli-plugin-electron-builder/lib/testWithPlaywright'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(chaiAsPromised)

describe('Application launch', function () {
  this.timeout(30000)

  beforeEach(function () {
    return testWithPlaywright().then((instance) => {
      this.app = instance.app
      this.stop = instance.stop
    })
  })

  beforeEach(function () {
    chaiAsPromised.transferPromiseness = this.app.transferPromiseness
  })

  afterEach(function () {
    return this.stop()
  })

  it('opens a window', async function () {
    const win = await this.app.firstWindow()
    const browserWindow = await this.app.browserWindow(win)
    const {
      isMinimized,
      isVisible,
      height,
      width
    } = await browserWindow.evaluate((browserWindow) => {
      return {
        isMinimized: browserWindow.isMinimized(),
        isVisible: browserWindow.isVisible(),
        ...browserWindow.getBounds()
      }
    })
    return Promise.all([
      this.app.windows().should.have.lengthOf(1),
      isMinimized.should.be.false,
      isVisible.should.be.true,
      width.should.be.above(0),
      height.should.be.above(0)
    ])
  })
})
