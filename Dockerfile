FROM node:latest

# Create app directory
RUN mkdir -p /usr/src/app

# Move to app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app/

# Set Node to production
ENV NODE_ENV=production

# Install all deps
RUN npm install

# Open port for server
EXPOSE 3000

# Set start command for server, through workaround
CMD [ "node", "server.js" ]
