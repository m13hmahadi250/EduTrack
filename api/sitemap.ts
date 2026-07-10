/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function generateSitemap(req: Request, res: Response) {
  try {
    // 1. Get host/domain dynamically or use fallback canonical domain
    const host = req.get('host') || 'edutrack.example.com';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    // 2. Load Firebase Configuration from root config file
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('firebase-applet-config.json not found');
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // 3. Initialize Firebase safely
    const appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = initializeFirestore(appInstance, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);

    // 4. Query public-facing tutor profiles
    const tutorsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'tutor')
    );
    const querySnapshot = await getDocs(tutorsQuery);
    
    const tutorIds: string[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.id) {
        tutorIds.push(data.id);
      }
    });

    const currentDate = formatDate(new Date());

    // 5. Build Sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    const staticPages = [
      { path: '', changefreq: 'daily', priority: '1.0' },
      { path: '/login', changefreq: 'monthly', priority: '0.8' },
      { path: '/signup', changefreq: 'monthly', priority: '0.8' },
    ];

    staticPages.forEach((page) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Dynamic tutor profile pages
    tutorIds.forEach((tutorId) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/teachers/${tutorId}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>\n`;

    // 6. Return XML response
    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error: any) {
    console.error('[Sitemap Generator Error]:', error);
    
    // Fallback static sitemap if Firestore/Firebase initialization fails, to ensure page never crashes
    const host = req.get('host') || 'edutrack.example.com';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;
    const currentDate = formatDate(new Date());

    let fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    fallbackXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    fallbackXml += `  <url>\n`;
    fallbackXml += `    <loc>${baseUrl}</loc>\n`;
    fallbackXml += `    <lastmod>${currentDate}</lastmod>\n`;
    fallbackXml += `    <changefreq>daily</changefreq>\n`;
    fallbackXml += `    <priority>1.0</priority>\n`;
    fallbackXml += `  </url>\n`;
    fallbackXml += `  <url>\n`;
    fallbackXml += `    <loc>${baseUrl}/login</loc>\n`;
    fallbackXml += `    <lastmod>${currentDate}</lastmod>\n`;
    fallbackXml += `    <changefreq>monthly</changefreq>\n`;
    fallbackXml += `    <priority>0.8</priority>\n`;
    fallbackXml += `  </url>\n`;
    fallbackXml += `  <url>\n`;
    fallbackXml += `    <loc>${baseUrl}/signup</loc>\n`;
    fallbackXml += `    <lastmod>${currentDate}</lastmod>\n`;
    fallbackXml += `    <changefreq>monthly</changefreq>\n`;
    fallbackXml += `    <priority>0.8</priority>\n`;
    fallbackXml += `  </url>\n`;
    fallbackXml += `</urlset>\n`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(fallbackXml);
  }
}
