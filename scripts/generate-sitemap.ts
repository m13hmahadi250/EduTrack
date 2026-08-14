import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, where } from 'firebase/firestore';

interface TutorData {
  id: string;
  name?: string;
  role?: string;
  district?: string;
  subjects?: string[];
  university?: string;
  profileImage?: string;
  isVerified?: boolean;
  isBlocked?: boolean;
  showOnHomePage?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

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

const CANONICAL_URL = 'https://edutrackbd.vercel.app';

export async function fetchActiveTutorsFromFirebase(): Promise<TutorData[]> {
  const tutors: TutorData[] = [];

  // Method 1: Use Firebase SDK with experimentalForceLongPolling for robust Node environment support
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      }, firebaseConfig.firestoreDatabaseId || '(default)');

      const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
      const snapshot = await getDocs(q);

      snapshot.forEach((doc) => {
        const data = doc.data() as TutorData;
        const tutorId = data.id || doc.id;
        if (tutorId && !data.isBlocked) {
          tutors.push({
            ...data,
            id: tutorId
          });
        }
      });

      if (tutors.length > 0) {
        console.log(`[Sitemap Generator] Successfully fetched ${tutors.length} active tutors via Firebase SDK.`);
        return tutors;
      }
    }
  } catch (sdkError: any) {
    console.warn('[Sitemap Generator] Firebase SDK fetch notice:', sdkError?.message || sdkError);
  }

  // Method 2: Fallback to direct Firestore REST API
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const projectId = firebaseConfig.projectId || 'edutrackbd-233';
      const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
      const apiKey = firebaseConfig.apiKey;

      const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users?key=${apiKey}&pageSize=300`;
      const res = await fetch(restUrl);
      if (res.ok) {
        const json = await res.json();
        const documents = json.documents || [];
        for (const doc of documents) {
          const fields = doc.fields || {};
          const role = fields.role?.stringValue;
          const isBlocked = fields.isBlocked?.booleanValue;
          if (role === 'tutor' && !isBlocked) {
            const docName = doc.name || '';
            const rawId = docName.split('/').pop() || fields.id?.stringValue;
            if (rawId) {
              tutors.push({
                id: fields.id?.stringValue || rawId,
                name: fields.name?.stringValue,
                district: fields.district?.stringValue,
                university: fields.university?.stringValue,
                profileImage: fields.profileImage?.stringValue,
                isVerified: fields.isVerified?.booleanValue,
                showOnHomePage: fields.showOnHomePage?.booleanValue,
                createdAt: fields.createdAt?.stringValue || doc.createTime,
                updatedAt: fields.updatedAt?.stringValue || doc.updateTime,
              });
            }
          }
        }
        console.log(`[Sitemap Generator] Successfully fetched ${tutors.length} active tutors via Firestore REST API.`);
      }
    }
  } catch (restError: any) {
    console.warn('[Sitemap Generator] Firestore REST API fetch notice:', restError?.message || restError);
  }

  return tutors;
}

export function generateSitemapXml(tutors: TutorData[], baseUrl: string = CANONICAL_URL): string {
  const currentDate = formatDate();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // 1. Core High-Priority Static Application Pages
  const staticPages = [
    {
      loc: `${baseUrl}/`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '1.0',
      image: {
        loc: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&h=630&q=80',
        title: 'EduTrack - #1 Tutor Finder & Home Tuition Platform in Bangladesh',
        caption: 'Find verified tutors from BUET, DU, Medical, and top universities in Dhaka and all divisions in Bangladesh'
      }
    },
    {
      loc: `${baseUrl}/signup`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.9',
    },
    {
      loc: `${baseUrl}/login`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.8',
    }
  ];

  for (const page of staticPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(page.loc)}</loc>\n`;
    xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    if (page.image) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(page.image.loc)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(page.image.title)}</image:title>\n`;
      xml += `      <image:caption>${escapeXml(page.image.caption)}</image:caption>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  // 2. Dynamic Tutor Profile Pages crawled from Firebase
  for (const tutor of tutors) {
    if (!tutor.id) continue;
    const tutorUrl = `${baseUrl}/teachers/${encodeURIComponent(tutor.id)}`;
    const lastmod = formatDate(tutor.updatedAt || tutor.createdAt);
    const tutorName = tutor.name || 'Verified Tutor';
    const districtText = tutor.district ? ` in ${tutor.district}` : ' in Bangladesh';
    const univText = tutor.university ? ` (${tutor.university})` : '';
    const title = `${tutorName} - Tuition Teacher${districtText}${univText}`;
    const caption = `Hire ${tutorName} for home and online tuition on EduTrack Bangladesh. Verified background and trusted education track record.`;

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(tutorUrl)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>${tutor.isVerified ? '0.9' : '0.85'}</priority>\n`;

    if (tutor.profileImage && tutor.profileImage.startsWith('http')) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(tutor.profileImage)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(title)}</image:title>\n`;
      xml += `      <image:caption>${escapeXml(caption)}</image:caption>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

export async function runSitemapBuild() {
  console.log('[Sitemap Generator] Starting dynamic sitemap crawling from Firebase...');
  try {
    const tutors = await fetchActiveTutorsFromFirebase();
    console.log(`[Sitemap Generator] Total active tutors discovered: ${tutors.length}`);

    const xmlContent = generateSitemapXml(tutors);

    // Write to public/sitemap.xml
    const publicPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    fs.writeFileSync(publicPath, xmlContent, 'utf-8');
    console.log(`[Sitemap Generator] Wrote sitemap.xml to ${publicPath}`);

    // Write to dist/sitemap.xml if dist exists
    const distDir = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      const distPath = path.join(distDir, 'sitemap.xml');
      fs.writeFileSync(distPath, xmlContent, 'utf-8');
      console.log(`[Sitemap Generator] Wrote sitemap.xml to ${distPath}`);
    }

    console.log('[Sitemap Generator] Sitemap generation complete!');
  } catch (err) {
    console.error('[Sitemap Generator Error]:', err);
  }
}

// Execute directly if run from CLI
runSitemapBuild().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('[Sitemap Generator Error]:', err);
  process.exit(0);
});

