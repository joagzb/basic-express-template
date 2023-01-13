# A basic Ready-to-use express server for building RESTful APIs

## Pre-requirements 📋

[nodejs](https://nodejs.org/es/) - a cross-platform, open-source server JavaScript runtime environment
[docker](https://www.docker.com) - Automates the deployment of applications within software containers

## Installation and Deployment 🔧📦

_At the root of the project, create a .env file that contains the environment variables as shown in the .env.example file:_

### local->

```
$ npm install
$ npm start
```

### docker->
_Build the Docker image by running the following command in the root of your project directory_

```
$ docker-compose up --build
```

## built using 🛠️

- [Node.js](https://nodejs.org/es/) - a cross-platform, open-source server JavaScript runtime environment
- [TypeScript](https://www.typescriptlang.org/) - a strongly typed programming language that builds on JavaScript.
- [Express](https://expressjs.com/es/) - a Node.js web application Infrastructure
- [Winston](https://github.com/winstonjs/winston) - A logger for express server
