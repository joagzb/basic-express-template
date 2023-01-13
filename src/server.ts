import express from 'express';
import cors from 'cors';
import Configuration from './config/index';
import userRouter from './api/user/user.routes';
import * as expressWinston from 'express-winston';
import {Logger} from './services/Logger.service';
import {errorHandler} from './middlewares/ErrorHandler.middleware';
import {getPackageInfo, getRunningHostAndPort, listObjectProperties} from './helpers/ServerMessages.utils';

export class App {
  private server: express.Application;
  private loggerInstance = Logger.getInstance();
  private defaultConfig = Configuration.ServerConfiguration.defaultConfig;

  constructor () {
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
    this.server.use(
      userRouter.routeName,
      userRouter.router,
    );
  }

  /**
  * sets up the middlewares for the express app
  */
  private initMiddlewares() {
    this.server.use(express.urlencoded({extended: false}));
    this.server.use(cors());
    this.server.use(express.json());

    // create a middleware to log your HTTP requests using winston logger
    this.server.use(
      expressWinston.logger(this.loggerInstance.expressWinstonConfig),
    );

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
    this.loggerInstance.logger.info(getPackageInfo());
    this.loggerInstance.logger.debug("server .env variables: \n" + listObjectProperties(Configuration.ServerConfiguration.defaultConfig));
    Configuration.DatabaseConfiguration.datasources.forEach(source => {
      this.loggerInstance.logger.debug("datasource: " + source);
      this.loggerInstance.logger.debug(listObjectProperties(Configuration.DatabaseConfiguration.getConnectionConfig(source)));
    });
    this.loggerInstance.logger.info(getRunningHostAndPort(this.server.get('host'), this.server.get('port')));
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
