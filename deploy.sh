#!/bin/bash

# Build the React app
echo "Building React app..."
npm run build

# Check if Wrangler is installed
if ! command -v wrangler &> /dev/null
then
    echo "Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
wrangler pages publish build --project-name=startup-cash-management

echo "Deployment complete! Your app should be available at https://startup-cash-management.pages.dev"
