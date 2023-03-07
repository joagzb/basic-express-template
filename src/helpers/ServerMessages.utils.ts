import {readFileSync} from 'fs';
import {resolve} from 'path';

/**
  @description shows a server running message.
  @param {string} host HOST running server
  @param {string} port PORT running server
  @returns string that includes a message indicating that the server is running at the specified host and port
*/
export const getRunningHostAndPort = (host: string, port: string): string => {
  return `
  ==================================================
  Server running at http://${host}:${port}
  ==================================================
  `;
};

/**
  @description list an object properties
  @param {any} obj an object that contain any property to be printed on console
  @returns string
*/
export const listObjectProperties = (obj: any, spacing = 0): string => {
  let propList = '';
  for (const prop in obj) {
    if (typeof obj[prop] !== 'object') {
      propList += `${''.padStart(spacing + 2, ' ') + prop}: ${obj[prop]}\n`;
    } else {
      propList += `${''.padStart(spacing, ' ') + prop}:\n${listObjectProperties(obj[prop], 2)}\n`;
    }
  }
  return propList;
};

/**
  @description reads the package.json file in the project directory
  @returns string that includes the package name, version, author, and license in a cool style
*/
export const getPackageInfo = (): string => {
  // Read the package.json file
  const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

  // Extract the name, version, author, and license fields
  const {name, version, author, license} = packageJson;

  // Return the package info in a cool style
  return `
  \u001b[36m==========  ${name} v${version}  ==========\u001b[0m
  Author: ${author}
  License: ${license}
  `;
};
