import express from 'express';
import cors from 'cors';
import userRouter from './api/user/user.routes';
import * as expressWinston from 'express-winston';
import {Logger} from './services/Logger.service';
import {errorHandler} from './middlewares/ErrorHandler.middleware';
import {getPackageInfo, getRunningHostAndPort, listObjectProperties} from './helpers/ServerMessages.utils';
import Configuration from './config/config';

class App {
  // PROPERTIES
  private server: express.Application;
  private loggerInstance = Logger.getInstance();
  private defaultConfig = Configuration.getConfig();

  // CTOR
  constructor() {
    // Create a new express app
    this.server = express();

    // initializations
    this.initConfiguration();
    this.initMiddlewares();
    this.initRoutes();
  }

  /**
   * configures and mount the routes for the express app
   */
  private initRoutes(): void {
    this.server.use(userRouter.routeName, userRouter.router);
  }

  /**
   * sets up the middlewares for the express app
   */
  private initMiddlewares() {
    this.server.use(express.urlencoded({extended: false}));
    this.server.use(cors());
    this.server.use(express.json());

    // create a middleware to log your HTTP requests using winston logger
    this.server.use(expressWinston.logger(this.loggerInstance.expressWinstonConfig));

    this.server.use(errorHandler);
  }

  /**
   * sets the express server configurations
   */
  private initConfiguration() {
    this.server.set('host', this.defaultConfig.server.HOST);
    this.server.set('port', this.defaultConfig.server.PORT);
    this.server.disable('x-powered-by');
  }

  private showServerUpMessages() {
    this.loggerInstance.logger.debug(`server .env variables: \n${listObjectProperties(this.defaultConfig)}`);

    this.loggerInstance.logger.info(`${getPackageInfo()} ${getRunningHostAndPort(this.server.get('host'), this.server.get('port'))}`);
  }

  /**
   * starts the express server
   */
  public initServer() {
    this.server.listen(this.server.get('port'), () => {
      this.showServerUpMessages();
    });
  }
}

export default new App();
