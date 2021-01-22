FROM node:fermium

# Install puppeteer dependencies
RUN apt-get -qq update && \
    apt-get -qq install --no-install-recommends \
    libgtk-3-0 libxtst6 libxss1 libnss3 libasound2 > /dev/null && \
    rm -rf /var/lib/apt/lists/*

# Set timezone
RUN rm -f /etc/localtime && ln -s /usr/share/zoneinfo/Europe/Madrid /etc/localtime

# Set production env
ENV NODE_ENV=production

# Create app directory
RUN mkdir -p /usr/src/app/server
WORKDIR /usr/src/app

# Install app dependencies
COPY server/package.json server/package.json
RUN npm install --prefix server

# Bundle app source
COPY server server
COPY client client

# De-escalate privileges
USER node

# Start server
CMD [ "node", "server/main.js" ]
