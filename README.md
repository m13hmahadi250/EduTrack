# EduTrack Bangladesh — Home Tutor Marketplace & Tutoring Management Platform

**Live Production Platform:** [https://edutrackbd.vercel.app/](https://edutrackbd.vercel.app/)  
**Target Market:** Bangladesh (Students, Parents/Guardians, Verified Tutors & Platform Administrators)

---

## 1. Architecture Overview

EduTrack Bangladesh is a full-stack TypeScript web application engineered for high performance, strict security, and zero-configuration deployment on **Vercel** as well as local/containerized Node.js environments:

- **Frontend:** React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Zustand (state synchronization) + Leaflet / React-Leaflet (interactive geolocation & safe-transit mapping).
- **Backend / API Layer:** Express (`/api/app.ts`) mounted via `server.ts` in development/container environments and exported via `/api/index.ts` as a Vercel Serverless Function in production.
- **Primary Database & Real-Time Sync:** Firebase Authentication + Cloud Firestore (`firestore.rules` with strict RBAC and schema validation).
- **Secondary Audit Mirror (Optional):** MongoDB Atlas via Mongoose (`/api/mongodb.ts`) for administrative audit trails and config mirroring.
- **Object Storage:** Cloudflare R2 (S3-compatible API with server-side MIME/folder allowlisting, 5 MB file size limit, and `sharp` EXIF stripping/WebP optimization).
- **Transactional Email:** Brevo REST API / Nodemailer SMTP (`/api/mailService.ts`) for 6-digit CSPRNG OTP verification and password reset delivery.

---

## 2. Local Development Setup

### Prerequisites
- **Node.js:** v20.x or v22.x LTS
- **npm:** v10+

### Installation & Startup
```bash
# 1. Install dependencies
npm install

# 2. Copy the environment variable template and fill in your credentials
cp .env.example .env

# 3. Start the full-stack development server on port 3000
npm run dev
```

---

## 3. Environment Variables Reference

All environment variables are documented in `.env.example` without any hardcoded secrets:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server | Optional Gemini API key for server-side study/analytics helpers |
| `GROQ_API_KEY` | Server | Optional Groq API key for AI tutor assistant endpoint (`/api/ai/chat`) |
| `BREVO_API_KEY` | Server | Brevo transactional email API key (`xkeysib-...`) |
| `BREVO_SENDER_EMAIL` | Server | Verified sender address for OTP and transactional emails |
| `BREVO_SENDER_NAME` | Server | Display name for transactional emails (`EduTrack Bangladesh`) |
| `R2_ACCESS_KEY_ID` | Server | Cloudflare R2 S3 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Server | Cloudflare R2 S3 Secret Access Key |
| `R2_BUCKET_NAME` | Server | Cloudflare R2 bucket name (`edutrack`) |
| `R2_ENDPOINT` | Server | Cloudflare R2 S3 endpoint URL |
| `R2_PUBLIC_URL` | Server | Public CDN URL for uploaded assets |
| `VITE_CARTO_API_KEY` | Client | Optional Carto basemap key |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Server | Optional Firebase Admin JSON (stateless HMAC OTP runs automatically on Vercel when omitted) |
| `OTP_HMAC_SECRET` | Server | Optional dedicated HMAC signing secret (auto-derived from server secrets when omitted) |

---

## 4. Security Architecture

### Authentication & 6-Digit CSPRNG OTP Verification
- **Server-Side Generation Only:** 6-digit OTPs are generated via `crypto.randomInt(100000, 1000000)` on the backend (`/api/auth/send-otp`).
- **Zero Client Exposure:** OTPs and password reset links are **never** returned in HTTP responses, logged to console, or displayed in the UI.
- **Hashed Persistence:** OTPs and password reset tokens are hashed with SHA-256 (`crypto.createHash('sha256')`) and verified using constant-time comparison (`crypto.timingSafeEqual`).
- **Rate Limiting & Brute-Force Protection:**
  - 5-minute OTP expiration window.
  - Maximum 5 failed verification attempts per OTP before automatic invalidation.
  - Single-use enforcement (deleted immediately upon verification).
  - 55-second resend cooldown per email address.
  - Per-IP and per-email sliding-window rate limits on `/api/auth/send-otp`, `/api/auth/verify-otp`, and `/api/auth/forgot-password`.

### File Upload Validation
- Allowed upload folders: `profiles`, `nid`, `documents`, `homework`, `general` (blocks path traversal).
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`.
- Maximum upload payload size: **5 MB**.
- Automatic image EXIF rotation/stripping and WebP compression via `sharp`.

### Firestore Security Rules (`firestore.rules`)
- Default deny (`allow read, write: if false`) on all unmatched paths.
- Role-based access control (`isAdmin()`, `isOwner(userId)`).
- Users cannot self-assign `role: 'admin'` on creation or escalate privileges on update.
- Sensitive PII (`nidNumber`, `nidUrl`, `studentIdUrl`) is stored in the restricted `/user_private/{userId}` collection accessible only to the document owner and verified administrators.

---

## 5. Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check and configuration readiness probe |
| `POST` | `/api/auth/send-otp` | Dispatches a 6-digit CSPRNG OTP to the user's email |
| `POST` | `/api/auth/verify-otp` | Verifies the 6-digit OTP and returns a signed `verificationToken` |
| `POST` | `/api/auth/forgot-password` | Dispatches a privacy-safe password reset link via email |
| `POST` | `/api/auth/verify-reset-token` | Validates a hashed password reset token |
| `POST` | `/api/auth/complete-password-reset` | Completes password update and invalidates the token |
| `POST` | `/api/storage/upload` | Validated server-side file upload to Cloudflare R2 |
| `POST` | `/api/storage/presign` | Generates a validated presigned upload URL for Cloudflare R2 |
| `POST` | `/api/ai/chat` | Rate-limited academic assistant proxy |

---

## 6. Testing, Linting & Production Build

```bash
# Run TypeScript typecheck / linting
npm run lint

# Run automated security & API test suite
npx tsx tests/edutrack.test.ts

# Build production frontend bundle
npm run build
```

---

## 7. Vercel Deployment

This repository is pre-configured for **Vercel** via `vercel.json` and `/api/index.ts`:
1. Import the repository into Vercel.
2. Configure the environment variables listed in `.env.example` inside the Vercel Project Settings.
3. Deploy — Vercel automatically builds the Vite SPA (`dist/`) and routes `/api/*` requests to `/api/index.ts`.
