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
   - **Environment Variables**: Add any required environment variables:
     - `GEMINI_API_KEY`: Your Google Gemini API Key.
4. **Deploy**: Click **"Deploy"**.

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
