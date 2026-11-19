import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'profile' | 'article';
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}

const DEFAULT_TITLE = "EduTrack Bangladesh | Verified Home Tutor & Tuition Platform — গৃহশিক্ষক খুঁজুন";
const DEFAULT_DESC = "Find verified home and online tutors in Dhaka, Chattogram, Sylhet, and all 64 districts of Bangladesh. Connect with university tutors for SSC, HSC, English Medium, Bangla Medium, and Admission coaching with live session tracking.";
const DEFAULT_KEYWORDS = "Home Tutor in Bangladesh, Find Tutor in Dhaka, Home Tutor in Chattogram, Tuition Media Bangladesh, Verified Home Tutor, online tutor bangladesh, ssc hsc science tutor, english medium tutor dhaka, bangla medium tuition, গৃহশিক্ষক খুঁজুন, বাসায় পড়ানোর শিক্ষক, টিউশন খুঁজুন, ঢাকা হোম টিউটর, চট্টগ্রাম গৃহশিক্ষক, এডু ট্র্যাক";
const BASE_URL = "https://edutrackbd.vercel.app";
const DEFAULT_IMAGE = "https://edutrackbd.vercel.app/og-image.png";

export default function SEOHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  keywords = DEFAULT_KEYWORDS,
  canonicalUrl,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  jsonLd,
  author = "EduTrack Bangladesh",
  publishedTime,
  modifiedTime,
  noindex = false,
}: SEOHeadProps) {
  const location = useLocation();
  const currentUrl = canonicalUrl || `${BASE_URL}${location.pathname}`;

  useEffect(() => {
    // 1. Update Document Title
    document.title = title;

    // 2. Helper to set or create meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        if (isProperty) {
          element.setAttribute('property', name);
        } else {
          element.setAttribute('name', name);
        }
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard Meta Tags (Protect private routes from search engine indexing)
    const isPrivateRoute =
      location.pathname.startsWith('/dashboard') ||
      location.pathname.startsWith('/messages') ||
      location.pathname.startsWith('/reset-password');
    const shouldNoIndex = Boolean(noindex) || isPrivateRoute;
    const robotsDirective = shouldNoIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

    setMeta('description', description);
    setMeta('keywords', keywords);
    setMeta('author', author);
    setMeta('robots', robotsDirective);
    setMeta('googlebot', robotsDirective);

    // Geo Meta Tags for Bangladesh Local Search Pack
    setMeta('geo.region', 'BD-13');
    setMeta('geo.placename', 'Dhaka, Bangladesh');
    setMeta('geo.position', '23.8103;90.4125');
    setMeta('ICBM', '23.8103, 90.4125');

    // OpenGraph Meta Tags
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', currentUrl, true);
    setMeta('og:type', ogType, true);
    setMeta('og:site_name', 'EduTrack Bangladesh', true);
    setMeta('og:image', ogImage, true);
    setMeta('og:image:secure_url', ogImage, true);
    setMeta('og:image:alt', title, true);
    setMeta('og:locale', 'en_US', true);
    setMeta('og:locale:alternate', 'bn_BD', true);

    // Twitter Card Meta Tags
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);
    setMeta('twitter:url', currentUrl);

    if (publishedTime) {
      setMeta('article:published_time', publishedTime, true);
    }
    if (modifiedTime) {
      setMeta('article:modified_time', modifiedTime, true);
    }

    // 3. Update Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', currentUrl);

    // 4. Inject or Update Dynamic JSON-LD Structured Data
    const scriptId = 'dynamic-page-jsonld';
    let dynamicScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    
    if (jsonLd) {
      if (!dynamicScript) {
        dynamicScript = document.createElement('script');
        dynamicScript.id = scriptId;
        dynamicScript.type = 'application/ld+json';
        document.head.appendChild(dynamicScript);
      }
      dynamicScript.textContent = JSON.stringify(jsonLd);
    } else if (dynamicScript) {
      dynamicScript.remove();
    }

    return () => {
      // Clean up dynamic JSON-LD on unmount
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [title, description, keywords, currentUrl, ogImage, ogType, jsonLd, author, publishedTime, modifiedTime, noindex, location.pathname]);

  return null;
}
