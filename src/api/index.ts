import ConfigService from '../config/config.js';
import {Router} from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const GLOBAL_URL_PREFIX = ConfigService.getInstance().getConfig().server.GLOBAL_URL_PREFIX;

const dinamicallyConfigureRoutes = async () => {
  const dirs = fs.readdirSync(__dirname);
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    if (isFeatureDirectory(dirPath)) {
      const routeFile = extractRouteFileFromDirectory(dirPath);
      await appendControllerRoute(dirPath, routeFile);
    }
  }
};

const getRouteGroupName = (fileName: string): string => {
  const groupName = fileName.split('.').shift();
  return `${GLOBAL_URL_PREFIX}/${groupName}`;
};

const extractRouteFileFromDirectory = (dirPath: string): string | undefined => {
  const files = fs.readdirSync(dirPath);
  return files.find(file => /route|router|routes/.test(file));
};

const isFeatureDirectory = (dirPath: string): boolean => {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    console.error(`Error checking if path is directory: ${err}`);
    return false;
  }
};

const appendControllerRoute = async (dirPath: string, routeFile: string | undefined) => {
  if (!routeFile) {
    return;
  }

  try {
    const routeName = getRouteGroupName(routeFile);
    const routeController = await import(path.join(dirPath, routeFile)).then(module => module.default);
    router.use(routeName, routeController.router);
  } catch (err) {
    console.error(`Error loading route controller from ${routeFile}: ${err}`);
  }
};

// Initialize routes
dinamicallyConfigureRoutes().catch(err => console.error(`Error initializing routes: ${err}`));
export default router;
