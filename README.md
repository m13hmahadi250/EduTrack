# Tutornix - Deployment Guide

This application is built with React, Vite, Tailwind CSS, and Firebase. To publish it to Vercel, follow these steps:

## Prerequisites
1. A [Vercel](https://vercel.com) account.
2. The project pushed to a GitHub/GitLab/Bitbucket repository.

## Vercel Deployment Steps

1. **New Project**: Go to your Vercel Dashboard and click **"Add New"** > **"Project"**.
2. **Import Repository**: Connect your Git account and import this repository.
3. **Configure Project**:
   - **Framework Preset**: Vercel should automatically detect **Vite**.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**: Add all required environment variables:
     - `GEMINI_API_KEY`: Your Google Gemini API Key.
     - `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob token (Generated in Vercel Dashboard > Storage > Blob).
     - `APP_URL`: `https://edutrackbd.vercel.app` (The URL where your app is hosted).
4. **Deploy**: Click **"Deploy"**.

## Troubleshooting

### ⚠️ Vercel Blob Setup
For Blob storage to work, you MUST:
1. Go to your Vercel Project Dashboard.
2. Click on the **"Storage"** tab.
3. Select **"Blob"** and follow the steps to create a new Blob store.
4. **CRITICAL**: Go to the **"Settings"** tab of your Blob store and ensure the **"Access Level"** is set to **"Public"**. (The app requires public URLs to display images and files in the dashboard).
5. Once created, Vercel will automatically add the `BLOB_READ_WRITE_TOKEN` to your environment variables.

### Build Warnings
Warnings like `node-domexception` are usually safe to ignore during build.

## Firebase Configuration
The application currently uses the configuration found in `firebase-applet-config.json`. 

### Security Rules
Ensure you have deployed your Firestore and Storage rules:
```bash
# Firestore Rules (firestore.rules)
# Storage Rules (storage.rules)
```
You can copy these rules directly into the Firebase Console if you are not using the Firebase CLI.

## Routing
A `vercel.json` file has been included to handle Single Page Application (SPA) routing, ensuring that page refreshes on sub-routes (like `/dashboard`) work correctly.
