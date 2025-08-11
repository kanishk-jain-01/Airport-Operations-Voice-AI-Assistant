# Multi-stage build for Node.js backend
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install build dependencies needed for native modules (sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy application source (includes SQLite database file)
COPY . .

# Development stage
FROM base AS development
# Keep all dependencies for hot reload
EXPOSE 3001 8080
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install build dependencies needed for native modules (sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy database from base stage (since it's not built, just copied)
COPY --from=base /app/*.db ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose ports (Express server and WebSocket server)
EXPOSE 3001 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(() => process.exit(0)).catch(() => process.exit(1))"

# Start the application
CMD ["npm", "start"]

# Default to production
FROM production
