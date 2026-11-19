/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export interface PublicTutorEntry {
  id: string;
  name: string;
  district?: string;
  area?: string;
  university?: string;
  course?: string;
  subjects?: string[];
  isVerified?: boolean;
  rating?: number;
  totalRatings?: number;
  bio?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface PublicTuitionEntry {
  id: string;
  title: string;
  subject: string;
  studentClass?: string;
  district: string;
  area?: string;
  salary?: number;
  daysPerWeek?: number;
  genderPreference?: string;
  status: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface SitemapData {
  tutors: PublicTutorEntry[];
  tuitions: PublicTuitionEntry[];
}

// Fallback high-intent curriculum tuition posts in Bangladesh
const SEED_TUITION_POSTS: PublicTuitionEntry[] = [
  {
    id: "tuition-hsc-science-dhanmondi",
    title: "HSC Science Higher Mathematics & Physics Home Tutor",
    subject: "Higher Mathematics, Physics",
    studentClass: "HSC Science",
    district: "Dhaka",
    area: "Dhanmondi",
    salary: 8000,
    daysPerWeek: 3,
    genderPreference: "Any",
    status: "active",
    createdAt: "2026-08-15"
  },
  {
    id: "tuition-olevel-pure-math-gulshan",
    title: "Cambridge O Level Pure Math & Chemistry Private Tutor",
    subject: "Pure Math, Chemistry, Physics",
    studentClass: "O Level / IGCSE",
    district: "Dhaka",
    area: "Gulshan-2",
    salary: 12000,
    daysPerWeek: 4,
    genderPreference: "Any",
    status: "active",
    createdAt: "2026-08-20"
  },
  {
    id: "tuition-ssc-english-version-ctg",
    title: "SSC Science English Version Home Tutor",
    subject: "Physics, Chemistry, General Math",
    studentClass: "SSC Candidate",
    district: "Chittagong",
    area: "Panchlaish",
    salary: 7500,
    daysPerWeek: 3,
    genderPreference: "Any",
    status: "active",
    createdAt: "2026-08-25"
  },
  {
    id: "tuition-admission-buet-mirpur",
    title: "Engineering Admission Test (BUET/CKRUET) Mentor",
    subject: "Advanced Mathematics, Physics",
    studentClass: "Admission Candidate",
    district: "Dhaka",
    area: "Mirpur-10",
    salary: 10000,
    daysPerWeek: 3,
    genderPreference: "Male",
    status: "active",
    createdAt: "2026-08-28"
  },
  {
    id: "tuition-class8-all-uttara",
    title: "Class 8 General Math, Science & English Tutor",
    subject: "General Math, Science, English",
    studentClass: "Class 8",
    district: "Dhaka",
    area: "Uttara Sector 4",
    salary: 6000,
    daysPerWeek: 4,
    genderPreference: "Female",
    status: "active",
    createdAt: "2026-08-30"
  },
  {
    id: "tuition-alevel-physics-sylhet",
    title: "Edexcel A Level Physics & Further Mathematics Tutor",
    subject: "Physics, Further Mathematics",
    studentClass: "A Level",
    district: "Sylhet",
    area: "Zindabazar",
    salary: 11000,
    daysPerWeek: 3,
    genderPreference: "Any",
    status: "active",
    createdAt: "2026-09-01"
  }
];

// Helper to format dates to standard ISO YYYY-MM-DD
export function formatDate(dateInput?: string | Date | number): string {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// XML entity escaping
export function escapeXml(unsafe: string): string {
  return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
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

// Singleton Firestore cache for the server environment
let cachedFirestore: any = null;

function getFirestoreServerInstance(firebaseConfig: any) {
  if (cachedFirestore) return cachedFirestore;
  
  const existingApp = getApps().find((a) => a.name === 'server-sitemap');
  const app = existingApp || initializeApp(firebaseConfig, 'server-sitemap');

  try {
    cachedFirestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId || '(default)');
  } catch {
    cachedFirestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  }

  return cachedFirestore;
}

/**
 * Fetches public teacher profiles and tuition posts from Firebase Firestore.
 * Fallback values are provided if the database is newly initialized.
 */
export async function fetchPublicEntitiesFromFirebase(): Promise<SitemapData> {
  const tutors: PublicTutorEntry[] = [];
  const tuitions: PublicTuitionEntry[] = [];
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');

  if (fs.existsSync(configPath)) {
    try {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const db = getFirestoreServerInstance(firebaseConfig);

      // 1. Fetch active, unblocked tutors from 'users' collection
      try {
        const tutorsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'tutor')
        );
        const tutorsSnapshot = await getDocs(tutorsQuery);
        
        tutorsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data && data.id && !data.isBlocked) {
            tutors.push({
              id: String(data.id),
              name: data.name || 'Verified Tutor',
              district: data.district,
              area: data.area,
              university: data.university,
              course: data.course,
              subjects: Array.isArray(data.subjects) ? data.subjects : [],
              isVerified: Boolean(data.isVerified),
              rating: typeof data.rating === 'number' ? data.rating : 5.0,
              totalRatings: typeof data.totalRatings === 'number' ? data.totalRatings : 0,
              bio: data.bio,
              updatedAt: data.updatedAt || data.createdAt,
              createdAt: data.createdAt,
            });
          }
        });
      } catch (tutorErr) {
        console.warn('[Sitemap] Tutor query notice:', tutorErr);
      }

      // 2. Fetch active tuition posts from 'tuitions' and 'tuition_posts' collections
      try {
        const tuitionSnapshots = await Promise.allSettled([
          getDocs(collection(db, 'tuitions')),
          getDocs(collection(db, 'tuition_posts')),
        ]);

        const seenTuitionIds = new Set<string>();

        tuitionSnapshots.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            result.value.forEach((doc) => {
              const data = doc.data();
              const docId = data.id || doc.id;
              if (docId && !seenTuitionIds.has(docId)) {
                seenTuitionIds.add(docId);
                const status = (data.status || 'active').toLowerCase();
                if (status === 'active' || status === 'pending' || status === 'open') {
                  tuitions.push({
                    id: String(docId),
                    title: data.title || `${data.subject || 'Academic'} Tuition in ${data.district || 'Dhaka'}`,
                    subject: data.subject || 'All Subjects',
                    studentClass: data.studentClass || data.class || 'Academic Class',
                    district: data.district || 'Dhaka',
                    area: data.area,
                    salary: typeof data.salary === 'number' ? data.salary : undefined,
                    daysPerWeek: typeof data.daysPerWeek === 'number' ? data.daysPerWeek : undefined,
                    genderPreference: data.genderPreference,
                    status: 'active',
                    updatedAt: data.updatedAt || data.createdAt,
                    createdAt: data.createdAt,
                  });
                }
              }
            });
          }
        });
      } catch (tuitionErr) {
        console.warn('[Sitemap] Tuition query notice:', tuitionErr);
      }

    } catch (configErr) {
      console.warn('[Sitemap] Firebase configuration loading error:', configErr);
    }
  }

  // If no tuition posts exist in Firestore yet, provide seed circulars so search engines index them immediately
  const finalTuitions = tuitions.length > 0 ? tuitions : SEED_TUITION_POSTS;

  return {
    tutors,
    tuitions: finalTuitions,
  };
}

/**
 * Builds valid XML string adhering to sitemaps.org 0.9 protocol,
 * with hreflang alternates and Google image extensions.
 */
export function buildSitemapXml(baseUrl: string, data: SitemapData): string {
  const currentDate = formatDate();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // Static high-priority entry points
  const staticPages = [
    {
      path: '',
      changefreq: 'daily',
      priority: '1.0',
      image: {
        loc: 'https://edutrackbd.vercel.app/og-image.png',
        title: 'EduTrack Bangladesh - Verified Home Tutor & Tuition Platform in Bangladesh',
        caption: 'Find verified home & online tutors across Dhaka, Chattogram, Sylhet, and all 64 districts of Bangladesh'
      }
    },
    { path: '/signup', changefreq: 'weekly', priority: '0.9' },
    { path: '/login', changefreq: 'monthly', priority: '0.8' },
  ];

  staticPages.forEach((page) => {
    const pageUrl = `${baseUrl}${page.path}`;
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(pageUrl)}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en-BD" href="${escapeXml(pageUrl)}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="bn-BD" href="${escapeXml(pageUrl)}" />\n`;
    if (page.image) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(page.image.loc)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(page.image.title)}</image:title>\n`;
      xml += `      <image:caption>${escapeXml(page.image.caption)}</image:caption>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  });

  // Dynamic Verified Tutor Profile URLs (no private tutor photos exposed in sitemap)
  data.tutors.forEach((tutor) => {
    const tutorUrl = `${baseUrl}/teachers/${encodeURIComponent(tutor.id)}`;
    const lastmod = formatDate(tutor.updatedAt || tutor.createdAt);

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(tutorUrl)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>${tutor.isVerified ? '0.95' : '0.85'}</priority>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en-BD" href="${escapeXml(tutorUrl)}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="bn-BD" href="${escapeXml(tutorUrl)}" />\n`;
    xml += `  </url>\n`;
  });

  // Dynamic Tuition Posts & Circulars URLs
  data.tuitions.forEach((tuition) => {
    const tuitionUrl = `${baseUrl}/tuitions/${encodeURIComponent(tuition.id)}`;
    const lastmod = formatDate(tuition.updatedAt || tuition.createdAt);
    const salaryText = tuition.salary ? ` (${tuition.salary} BDT/mo)` : '';
    const title = `${tuition.title} in ${tuition.district}${salaryText} - EduTrack`;
    const caption = `Verified tuition requirement: ${tuition.title} for ${tuition.studentClass || 'student'} in ${tuition.district}, Bangladesh. Apply as a verified mentor.`;

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(tuitionUrl)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.90</priority>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en-BD" href="${escapeXml(tuitionUrl)}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="bn-BD" href="${escapeXml(tuitionUrl)}" />\n`;
    xml += `    <image:image>\n`;
    xml += `      <image:loc>https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&h=630&q=80</image:loc>\n`;
    xml += `      <image:title>${escapeXml(title)}</image:title>\n`;
    xml += `      <image:caption>${escapeXml(caption)}</image:caption>\n`;
    xml += `    </image:image>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>\n`;
  return xml;
}

/**
 * Returns dynamic sitemap XML string directly.
 */
export async function getDynamicSitemapXml(baseUrl: string): Promise<string> {
  const data = await fetchPublicEntitiesFromFirebase();
  return buildSitemapXml(baseUrl, data);
}

/**
 * Express Route Handler: Serves dynamic sitemap.xml with caching headers.
 */
export async function generateSitemap(req: Request, res: Response) {
  try {
    const host = req.get('host') || 'edutrackbd.vercel.app';
    const protocol = req.protocol || 'https';
    const baseUrl = host.includes('localhost') || host.includes('127.0.0.1')
      ? `${protocol}://${host}`
      : 'https://edutrackbd.vercel.app';

    const xml = await getDynamicSitemapXml(baseUrl);

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    res.status(200).send(xml);
  } catch (error: any) {
    console.error('[Sitemap Route Error]:', error);

    // Reliable fallback static sitemap in case of any unhandled exceptions
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
    fallbackXml += `</urlset>\n`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(fallbackXml);
  }
}

export default generateSitemap;

