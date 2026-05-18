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
     - `UPLOADTHING_TOKEN`: Your unified UploadThing token (from the UploadThing dashboard).
     - `APP_URL`: `https://edutrackbd.vercel.app` (The URL where your app is hosted).
4. **Deploy**: Click **"Deploy"**.

## Troubleshooting

### UploadThing Errors
If you see "Failed to parse response from UploadThing server" or 404s on `/api/uploadthing`:
- Ensure `UPLOADTHING_TOKEN` and `APP_URL` are set in the Vercel environment variables.
- Double-check that your Vercel project is using Node.js 18 or 20 (Settings > General).

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
