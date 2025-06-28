FROM node:22.14.0-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Expose the port that Vite uses
EXPOSE 5173

# Default command
CMD ["npm", "run", "dev"]


