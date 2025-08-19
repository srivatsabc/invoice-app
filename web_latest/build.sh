#!/bin/bash

# Build script for Invoice Analyzer Docker deployment

set -e

echo "🚀 Building Invoice Analyzer Docker Image..."

# Build the Docker image
docker build -t invoice-analyzer:latest .

echo "✅ Docker image built successfully!"

# Optional: Tag for registry
# docker tag invoice-analyzer:latest your-registry.com/invoice-analyzer:latest

echo "📦 Available commands:"
echo "  Run locally:           docker run -p 3000:80 invoice-analyzer:latest"
echo "  Run with compose:      docker-compose up -d"
echo "  Run with proxy:        docker-compose --profile proxy up -d"
echo "  View logs:             docker-compose logs -f"
echo "  Stop services:         docker-compose down"

echo "🌐 Application will be available at:"
echo "  Local:                 http://localhost:3000"
echo "  With proxy:            http://localhost"