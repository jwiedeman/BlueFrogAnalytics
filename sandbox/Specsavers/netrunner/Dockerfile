# Dockerfile for flow-runner
# Uses official Playwright image with browser dependencies pre-installed
FROM mcr.microsoft.com/playwright:1.38.0-focal

# set working directory
WORKDIR /app

# install dependencies
COPY package*.json ./
RUN npm ci --only=production

# copy application source
COPY . .

# copy entrypoint script and make it executable
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# define mount points for flows and outputs
VOLUME ["/app/flows", "/app/output"]

# set default entrypoint to wrapper that reads env vars
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]