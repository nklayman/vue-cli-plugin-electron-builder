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
    if (this.app && this.app.isRunning()) {
      return this.stop()
    }
  })

  it('opens a window', function () {
    return Promise.all([
      this.app.client.getWindowCount().should.eventually.have.at.least(1),
      this.app.client.browserWindow.isMinimized().should.eventually.be.false,
      this.app.client.browserWindow.isVisible().should.eventually.be.true,
      this.app.client.browserWindow
        .getBounds()
        .should.eventually.have.property('width')
        .and.be.above(0),
      this.app.client.browserWindow
        .getBounds()
        .should.eventually.have.property('height')
        .and.be.above(0)
    ])
  })
})
