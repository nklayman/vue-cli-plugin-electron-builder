import { ElectronApplication } from 'playwright-core'
import { Configuration as ElectronBuilderOptions } from 'electron-builder'
import * as ChainableWebpackConfig from 'webpack-chain'

interface Options {
  /**
    Do not launch Playwright.
    You will have to launch it on your own.
  */
  noPlaywright?: boolean
  /** Custom Playwright launch options. These will be merged with default options. */
  launchOptions?: Object
  /** Set custom Vue env mode. Defaults to 'production' */
  mode?: string
}
interface ElectronInstance {
  /** Playwright application instance. */
  app: ElectronApplication
  /** Close app instance and stop dev server (must be called to prevent continued async operations). */
  stop: () => Promise<ElectronApplication>
  /** URL of dev server. */
  serverUrl: string
  /** Log of dev server. */
  serverStdout: string
}

/**
  Run electron:serve, but instead of launching Electron it returns a Playwright Application instance.
  Used for e2e testing with Playwright.
*/
export function testWithPlaywright(options?: Options): Promise<ElectronInstance>

export type PluginOptions = {
  builderOptions?: ElectronBuilderOptions
  chainWebpackMainProcess?: (config?: ChainableWebpackConfig) => void
  chainWebpackRendererProcess?: (config?: ChainableWebpackConfig) => void
  mainProcessFile?: string
  rendererProcessFile?: string
  mainProcessWatch?: string[]
  mainProcessArgs?: string[]
  outputDir?: string
  disableMainProcessTypescript?: boolean
  mainProcessTypeChecking?: boolean
  customFileProtocol?: string
  externals?: string[]
  nodeModulesPath?: string[]
  preload?: string | Record<string, string>
  nodeIntegration?: boolean
}
