#!/bin/bash

# Exit on any error
set -e

echo "Loading environment variables..."
set -a
source .env.production
set +a

echo "Building Docker image..."
docker-compose build

echo "Pushing Docker image..."
docker-compose push

# Deploy to EC2
echo "Deploying to EC2..."
ssh -i ~/.ssh/your-key.pem ec2-user@soulvents.com << 'ENDSSH'
cd /home/ec2-user/soulvents/frontend
git pull
docker-compose pull

echo "Stopping old containers..."
docker-compose down

echo "Starting new containers..."
docker-compose up -d --build
ENDSSH

# Health check to ensure container is running
sleep 10
response=$(curl -s -o /dev/null -w "%{http_code}" https://soulvents.com/health)
if [ "$response" != "200" ]; then
  echo "Deployment failed. Rolling back..."
  ssh -i ~/.ssh/your-key.pem ec2-user@soulvents.com << 'ENDSSH'
  docker-compose down
  git reset --hard HEAD~1
  docker-compose up -d
  ENDSSH
  echo "Rollback complete."
else
  echo "Deployment successful."
fi