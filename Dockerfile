# Multi-stage Dockerfile for Grocery List App
# Supports both development and production builds

# ============================================
# Stage 1: Base Python image
# ============================================
FROM python:3.12-slim AS python-base

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ============================================
# Stage 2: Node.js for frontend build
# ============================================
FROM node:22-slim AS frontend-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ============================================
# Stage 3: Development image
# ============================================
FROM python:3.12-slim AS development

# Install Node.js
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install frontend dependencies
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

# Copy all source code
WORKDIR /app
COPY . .

EXPOSE 5173 3001

# Default command runs both frontend and API
CMD ["sh", "-c", "cd /app/client && npm run dev -- --host & python /app/api/dev_server.py"]

# ============================================
# Stage 4: Production image
# ============================================
FROM python:3.12-slim AS production

# Install nginx
RUN apt-get update && apt-get install -y nginx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies and code
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ ./api/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/client/dist /var/www/html

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/sites-available/default

EXPOSE 80 3001

# Run nginx and API server
CMD ["sh", "-c", "nginx && python /app/api/dev_server.py"]
