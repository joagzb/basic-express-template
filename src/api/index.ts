import ConfigService from '../config/config.js';
import {Router} from 'express';
import fs from 'fs';
import path from 'path';

/** ======================================================================
 * This file dynamically discovers and loads all feature route
 * modules inside the `api` directory.
 *
 * It searches for subdirectories with route files (e.g. `users.route.ts`, `orders.routes.ts`)
 * and mounts them under the global API prefix from config.
 *
 * This mechanism makes the project scalable and keeps routing modular.
 *
 * ⚠️ Do not modify this file unless you're updating the dynamic routing system.
 ====================================================================== */
const router = Router();
const GLOBAL_URL_PREFIX = ConfigService.getInstance().getConfig().server.GLOBAL_URL_PREFIX;

/**
 * Loop through subfolders inside ./api
 * If a subfolder contains a route file, load and mount it on the router
 */
const dynamicallyConfigureRoutes = async () => {
  const dirs = fs.readdirSync(__dirname);
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    if (isFeatureDirectory(dirPath)) {
      const routeFile = extractRouteFileFromDirectory(dirPath);
      await appendControllerRoute(dirPath, routeFile);
    }
  }
};

/**
 * Extracts route group name from file name
 * (e.g. users.route.ts → /api/users)
 */
const getRouteGroupName = (fileName: string): string => {
  const groupName = fileName.split('.').shift();
  return `${GLOBAL_URL_PREFIX}/${groupName}`;
};

/**
 * Finds a file matching "route|router|routes" inside the given directory
 */
const extractRouteFileFromDirectory = (dirPath: string): string | undefined => {
  const files = fs.readdirSync(dirPath);
  return files.find(file => /route|router|routes/.test(file));
};

/**
 * Checks if the given path is a directory
 */
const isFeatureDirectory = (dirPath: string): boolean => {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    console.error(`Error checking if path is directory: ${err}`);
    return false;
  }
};

/**
 * Dynamically imports and attaches a route controller to the main router
 */
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
dynamicallyConfigureRoutes().catch(err => console.error(`Error initializing routes: ${err}`));
export default router;
