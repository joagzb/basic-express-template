import assert from 'assert';
import {developmentConfig} from './config.development';
import {AppConfig} from './config.types';

/** ========================================================
 *
 * Manages server configurations
 *
 ======================================================== */
export default class Configuration {
  public static getConfig(): AppConfig {
    const configurations = {
      development: developmentConfig,
    };

    assert.ok(process.env.NODE_ENV, 'NODE_ENV environment variable must be set');
    const serverConfig: AppConfig = configurations[process.env.NODE_ENV];
    if (!serverConfig) {
      throw new Error('Unsupported environment');
    }

    return serverConfig;
  }

  // CTOR
  public constructor() {}
}
