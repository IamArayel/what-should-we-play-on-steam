FROM node:13

# Create app directory
RUN mkdir -p /usr/src/app

# Move to app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app/

# Set Environment for producrtion
ENV NODE_ENV=production
ENV PORT=3000
ENV REDIS_SERVICE_HOST=localhost
ENV REDIS_SERVICE_PORT=6379
ENV REDIS_EXPIRE=900

# Install all deps
RUN npm install

# Open port for server
EXPOSE 3000

# Set start command for server
CMD [ "node", "server.js" ]
