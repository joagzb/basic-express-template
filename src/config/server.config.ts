interface ServerConfig {
  STAGE: string; // 'development' | 'production'
  GLOBAL_URL_PREFIX: string;
  server: {
    HOST: string;
    PORT: number | string;
  };
}

/** ========================================================
 *
 * Manages server configurations
 *
 ======================================================== */
export class ServerConfiguration {
  // PROPERTIES
  static readonly defaultConfig: ServerConfig = {
    STAGE: process.env.NODE_ENV || 'development',
    GLOBAL_URL_PREFIX: process.env.URL_PREFIX || '',
    server: {
      HOST: process.env.HOST || 'localhost',
      PORT: process.env.PORT || 3000,
    },
  };

  // CTOR
  public constructor () {}

}
