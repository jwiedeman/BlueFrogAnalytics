FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package.json package-lock.json* /app/
# Install app dependencies
RUN npm install --production


# Bundle app source
COPY . /app

ENTRYPOINT ["node", "index.js"]
CMD ["--help"]