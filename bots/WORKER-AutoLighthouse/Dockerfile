FROM node:18-alpine

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

ENTRYPOINT ["node", "index.js"]