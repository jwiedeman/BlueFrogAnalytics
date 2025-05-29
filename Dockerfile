# Use official Node.js LTS image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy server code
COPY server ./server

# Expose port for API server
EXPOSE 3001

# Start API server
CMD ["node", "server/apiServer.js"]
