FROM node:20-bookworm-slim AS development
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
COPY .husky/install.mjs ./.husky/install.mjs
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY eslint.config.cjs jest.config.cjs .prettierrc .prettierignore ./
COPY src ./src
CMD ["npm", "run", "dev"]

FROM development AS build
RUN npm run build

FROM node:20-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
COPY .husky/install.mjs ./.husky/install.mjs
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /usr/src/app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const port=process.env.PORT||3000;const raw=process.env.URL_PREFIX||'/api';const prefix=raw==='/'?'':raw.replace(/\/+$/,'');require('node:http').get('http://127.0.0.1:'+port+prefix+'/health/ping',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/index.js"]
