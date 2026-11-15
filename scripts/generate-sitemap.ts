import fs from 'fs';
import path from 'path';

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

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const projectId = firebaseConfig.projectId || 'edutrackbd-233';
      const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
      const apiKey = firebaseConfig.apiKey;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      try {
        const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users?key=${apiKey}&pageSize=300`;
        const res = await fetch(restUrl, { signal: controller.signal });
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
          console.log(`[Sitemap Generator] Fetched ${tutors.length} active tutors via Firestore REST API.`);
        }
      } finally {
        clearTimeout(timeout);
      }
    }
  } catch (restError: any) {
    console.log('[Sitemap Generator] Using existing/static sitemap fallback:', restError?.message || 'offline');
  }

  return tutors;
}

export function generateSitemapXml(tutors: TutorData[], baseUrl: string = CANONICAL_URL): string {
  const currentDate = formatDate();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

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
  console.log('[Sitemap Generator] Checking sitemap...');
  try {
    const publicPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    const tutors = await fetchActiveTutorsFromFirebase();

    // Only overwrite public/sitemap.xml if we fetched tutors or if public/sitemap.xml doesn't exist yet
    if (tutors.length > 0 || !fs.existsSync(publicPath)) {
      const xmlContent = generateSitemapXml(tutors);
      fs.writeFileSync(publicPath, xmlContent, 'utf-8');
      console.log(`[Sitemap Generator] Wrote sitemap.xml (${tutors.length} tutors) to ${publicPath}`);
    } else {
      console.log('[Sitemap Generator] Preserved existing public/sitemap.xml.');
    }
  } catch (err) {
    console.warn('[Sitemap Generator Notice]:', err);
  }
}

runSitemapBuild().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(0);
});
