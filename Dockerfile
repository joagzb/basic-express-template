# Check out https://hub.docker.com/_/node to select a new base image
FROM node:16-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Healthcheck to ensure container is healthy
HEALTHCHECK --interval=30s --timeout=10s \
  CMD curl -fs http://localhost:3000 || exit 1

# Command to run the application
CMD [ "npm", "start" ]