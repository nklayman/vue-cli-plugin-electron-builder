import { Application, AppConstructorOptions } from 'spectron'
import { Configuration as ElectronBuilderOptions } from 'electron-builder'
import * as ChainableWebpackConfig from 'webpack-chain'

interface Options {
  /**
   Do not launch spectron.
   You will have to launch it on your own.
   */
  noSpectron: boolean
  /** Launch server in dev mode, not in production. */
  forceDev: boolean
  /** Custom spectron options.These will be merged with default options. */
  spectronOptions: AppConstructorOptions
  /** Do not start app or wait for it to load.
   You will have to run app.start() and app.client.waitUntilWindowLoaded() yourself.
   */
  noStart: boolean
  /** Set custom Vue env mode. Defaults to 'test' */
  mode: string
}
interface Server {
  /** Spectron instance. */
  app: Application
  /** URL of dev server. */
  url: string
  /** Close spectron and stop dev server (must be called to prevent continued async operations). */
  stopServe: () => Promise<Application>
  /** Log of dev server. */
  stdout: string
}

/**
   Run electron:serve, but instead of launching Electron it returns a Spectron Application instance.
   Used for e2e testing with Spectron.
*/
export function testWithSpectron(spectron: any, options?: Partial<Options>): Promise<Server>

  
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
