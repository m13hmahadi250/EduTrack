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
function formatDate(dateInput?: string | Date | number): string {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function generateSitemap(req: Request, res: Response) {
  try {
    // 1. Get host/domain dynamically or use fallback canonical domain
    const host = req.get('host') || 'edutrackbd.vercel.app';
    const protocol = req.protocol || 'https';
    const baseUrl = host.includes('localhost') || host.includes('127.0.0.1')
      ? `${protocol}://${host}`
      : 'https://edutrackbd.vercel.app';

    // 2. Load Firebase Configuration from root config file
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let tutors: any[] = [];

    if (fs.existsSync(configPath)) {
      try {
        const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        const db = initializeFirestore(appInstance, {
          experimentalForceLongPolling: true,
        }, firebaseConfig.firestoreDatabaseId);

        const tutorsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'tutor')
        );
        const querySnapshot = await getDocs(tutorsQuery);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.id && !data.isBlocked) {
            tutors.push(data);
          }
        });
      } catch (dbErr) {
        console.warn('[Sitemap Generator] Firestore query skipped:', dbErr);
      }
    }

    const currentDate = formatDate();

    // 3. Build Rich Sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // Static pages
    const staticPages = [
      {
        path: '',
        changefreq: 'daily',
        priority: '1.0',
        image: {
          loc: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&h=630&q=80',
          title: 'EduTrack Bangladesh - #1 Home Tutor & Tuition Platform in Bangladesh',
          caption: 'Find verified home & online tutors from BUET, DU, Medical, and top universities in Dhaka, Chittagong, Sylhet, and all divisions'
        }
      },
      { path: '/signup', changefreq: 'weekly', priority: '0.9' },
      { path: '/login', changefreq: 'monthly', priority: '0.8' },
      { path: '/reset-password', changefreq: 'monthly', priority: '0.5' },
    ];

    staticPages.forEach((page) => {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${baseUrl}${page.path}`)}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="en-BD" href="${escapeXml(`${baseUrl}${page.path}`)}" />\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="bn-BD" href="${escapeXml(`${baseUrl}${page.path}`)}" />\n`;
      if (page.image) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${escapeXml(page.image.loc)}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(page.image.title)}</image:title>\n`;
        xml += `      <image:caption>${escapeXml(page.image.caption)}</image:caption>\n`;
        xml += `    </image:image>\n`;
      }
      xml += `  </url>\n`;
    });

    // Dynamic tutor profile pages
    tutors.forEach((tutor) => {
      const tutorUrl = `${baseUrl}/teachers/${encodeURIComponent(tutor.id)}`;
      const lastmod = formatDate(tutor.updatedAt || tutor.createdAt);
      const tutorName = tutor.name || 'Verified Tutor';
      const districtText = tutor.district ? ` in ${tutor.district}` : ' in Bangladesh';
      const univText = tutor.university ? ` (${tutor.university})` : '';
      const title = `${tutorName} - Verified Tuition Teacher${districtText}${univText}`;
      const caption = `Hire ${tutorName} for home and online tuition on EduTrack Bangladesh. Verified NID, student background, and academic track record.`;

      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(tutorUrl)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${tutor.isVerified ? '0.95' : '0.85'}</priority>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="en-BD" href="${escapeXml(tutorUrl)}" />\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="bn-BD" href="${escapeXml(tutorUrl)}" />\n`;

      if (tutor.profileImage && tutor.profileImage.startsWith('http')) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${escapeXml(tutor.profileImage)}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(title)}</image:title>\n`;
        xml += `      <image:caption>${escapeXml(caption)}</image:caption>\n`;
        xml += `    </image:image>\n`;
      }
      xml += `  </url>\n`;
    });

    xml += `</urlset>\n`;

    // 4. Return XML response
    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    res.status(200).send(xml);
  } catch (error: any) {
    console.error('[Sitemap Generator Error]:', error);
    
    // Fallback static sitemap
    const baseUrl = 'https://edutrackbd.vercel.app';
    const currentDate = formatDate();

    let fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    fallbackXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    fallbackXml += `  <url>\n`;
    fallbackXml += `    <loc>${baseUrl}/</loc>\n`;
    fallbackXml += `    <lastmod>${currentDate}</lastmod>\n`;
    fallbackXml += `    <changefreq>daily</changefreq>\n`;
    fallbackXml += `    <priority>1.0</priority>\n`;
    fallbackXml += `  </url>\n`;
    fallbackXml += `  <url>\n`;
    fallbackXml += `    <loc>${baseUrl}/signup</loc>\n`;
    fallbackXml += `    <lastmod>${currentDate}</lastmod>\n`;
    fallbackXml += `    <changefreq>weekly</changefreq>\n`;
    fallbackXml += `    <priority>0.9</priority>\n`;
    fallbackXml += `  </url>\n`;
    fallbackXml += `  <url>\n`;
    fallbackXml += `    <loc>${baseUrl}/login</loc>\n`;
    fallbackXml += `    <lastmod>${currentDate}</lastmod>\n`;
    fallbackXml += `    <changefreq>monthly</changefreq>\n`;
    fallbackXml += `    <priority>0.8</priority>\n`;
    fallbackXml += `  </url>\n`;
    fallbackXml += `  <url>\n`;
    fallbackXml += `    <loc>${baseUrl}/reset-password</loc>\n`;
    fallbackXml += `    <lastmod>${currentDate}</lastmod>\n`;
    fallbackXml += `    <changefreq>monthly</changefreq>\n`;
    fallbackXml += `    <priority>0.5</priority>\n`;
    fallbackXml += `  </url>\n`;
    fallbackXml += `</urlset>\n`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(fallbackXml);
  }
}

