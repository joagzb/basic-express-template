# Use the official Node.js image as the build environment
FROM node:16-slim AS builder

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Use a smaller Node.js image for the runtime environment
FROM node:16-slim

# Create app directory
WORKDIR /usr/src/app

# Copy only the build output and package.json to the runtime image
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Install only production dependencies
RUN npm install --production

# Expose the port your app runs on
ENV NODE_ENV production
ENV PORT 3000
EXPOSE $PORT

# Command to run the application
CMD ["node", "dist/index.js"]