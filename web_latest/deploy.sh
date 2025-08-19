#!/bin/bash

# Deployment script for Invoice Analyzer

set -e

echo "🚀 Deploying Invoice Analyzer..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build the application
echo "📦 Building Docker image..."
docker build -t invoice-analyzer:latest .

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Start the application
echo "🚀 Starting application..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for application to be healthy..."
sleep 10

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Application deployed successfully!"
    echo "🌐 Access your application at: http://localhost:3000"
    echo "📊 Health check: http://localhost:3000/health"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs:    docker-compose logs -f"
    echo "  Stop app:     docker-compose down"
    echo "  Restart:      docker-compose restart"
else
    echo "❌ Deployment failed. Check logs with: docker-compose logs"
    exit 1
fi