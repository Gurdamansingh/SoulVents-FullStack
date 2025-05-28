# FROM node:18-alpine
FROM node:18-bullseye

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source code
COPY . .

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:5000/health || exit 1

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
