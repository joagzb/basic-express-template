# Ready-to-Use Express Server for Building RESTful APIs

A basic Express server template for quickly building RESTful APIs using Node.js and TypeScript.

## Project Description

This project provides a boilerplate Express server setup with TypeScript for building RESTful APIs. It includes configuration for local development and Docker deployment.

## Prerequisites 📋

- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Docker](https://www.docker.com/) - Containerization platform

## Installation and Deployment 🔧📦

_Under src/api, create a new folder that has to contain all the files representing a subdomain, feature, page, etc. You can follow 'user' folder as an example. Note that this folder must contain:_
1. <featureName>.route.ts - route controller where 'featureName' will be the route name. E.g. user.route.ts -> [GET|POST] api/user/
2. <featureName>.controller.ts - controller where 'featureName' will be the class name. E.g. user.controller.ts -> class UserController

_At the root of the project, create a .env file that must contains the environment variables as shown in the .env.example:_

1. **Local Development:**

   - Clone the repository and navigate to the project directory.
   - Create a `.env` file based on `.env.example` with necessary environment variables.
   - Install dependencies and start the server:

     ```bash
     npm install
     npm start
     ```

2. **Using Docker:**

   - Build and run the Docker image:

     ```bash
     docker build -t my-node-app-name .
     ```

   - run the Docker image:

     ```bash
     docker run -p 3000:3000 my-node-app-name
     ```

   - the server will be available at http://localhost:3000

## Built With 🛠️

- [Node.js](https://nodejs.org/) - Cross-platform JavaScript runtime
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript
- [Express](https://expressjs.com/) - Web framework for Node.js
- [Winston](https://github.com/winstonjs/winston) - Logging library for Node.js

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
