# Check out https://hub.docker.com/_/node to select a new base image
FROM node:16-slim

# Create a new directory in the image to hold the application code
RUN mkdir -p /usr/src/app

# set the working directory for the container to the app's root directory
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json (or yarn.lock) files to the container
# 'package*.json' wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# set container environments variables and map them to the host OS
EXPOSE 3000

# init server by running package.json commands
CMD [ "npm", "start" ]
