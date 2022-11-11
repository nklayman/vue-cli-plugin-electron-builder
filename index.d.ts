import { ElectronApplication } from "playwright-core"
import { Configuration as ElectronBuilderOptions } from 'electron-builder'
import * as ChainableWebpackConfig from 'webpack-chain'

interface OptionsPlaywright {
  /**
   Do not launch playwright.
   You will have to launch it on your own.
   */
  noPlaywright: boolean
  /** Launch server in dev mode, not in production. */
  forceDev: boolean
  /** Custom playwright launch options. These will be merged with default options. */
  launchOptions: Object
  /** Set custom Vue env mode. Defaults to 'test' */
  mode: string
}

interface ServerPlaywright {
  /** Playwright instance. */
  app: ElectronApplication
  /** URL of dev server. */
  url: string
  /** Close playwright and stop dev server (must be called to prevent continued async operations). */
  stop: () => Promise<void>
  /** Log of dev server. */
  stdout: string
}

/**
 Run electron:serve, but instead of launching Electron it returns a Playwright Application instance.
 Used for e2e testing with Playwright.
 */
export function testWithPlaywright(options?: Partial<OptionsPlaywright>): Promise<ServerPlaywright>

export type PluginOptions = {
  builderOptions?: ElectronBuilderOptions,
  chainWebpackMainProcess?: (config?: ChainableWebpackConfig) => void,
  chainWebpackRendererProcess?: (config?: ChainableWebpackConfig) => void,
  mainProcessFile?: string,
  rendererProcessFile?: string,
  mainProcessWatch?: string[],
  mainProcessArgs?: string[],
  outputDir?: string,
  disableMainProcessTypescript?: boolean,
  mainProcessTypeChecking?: boolean,
  customFileProtocol?: string,
  removeElectronJunk?: boolean,
  externals?: string[],
  nodeModulesPath?: string[],
  preload?: string | Record<string, string>
}
