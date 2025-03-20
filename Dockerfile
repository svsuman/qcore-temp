# Use Node.js LTS as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libgconf-2-4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libnspr4 \
    libnss3 \
    && rm -rf /var/lib/apt/lists/*

# Configure npm to use private registry with authentication
RUN echo "registry=https://nexus.rocs.io:8081/repository/npm-public/" > .npmrc && \
    echo "always-auth=true" >> .npmrc && \
    echo "email=govindaraj.venkatachalam@skillsoft.com" >> .npmrc && \
    echo "//nexus.rocs.io:8081/repository/npm-public/:_auth=\"ZGVwbG95bWVudDpTZXJpT3VzbHlOb3RUaGlzMSE=\"" >> .npmrc

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Create necessary directories
RUN mkdir -p test-results config/profiles

# Copy application files
COPY . .

# Create a simple .env file for testing
RUN echo "SLACK_BOT_TOKEN_1=dummy-token-1\nSLACK_BOT_TOKEN_2=dummy-token-2" > .env

# Environment variables
ENV NODE_ENV=develop \
    AWS_REGION=us-east-1 \
    AWS_DEFAULT_REGION=us-east-1

# Generate encryption key
RUN node scripts/generateKey.js

# Command to run smoke tests
CMD ["npx", "playwright", "test", "--grep", "@smoke"]
