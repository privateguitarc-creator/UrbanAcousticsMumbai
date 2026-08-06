import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Fallback logic to support both GitHub Actions secrets and local/Vercel .env
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const guitarImages = [
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop'
];

// Target Localities Queue
const targetLocalities = [
  'Bandra West', 'Andheri East', 'Powai', 'Juhu', 'Dadar', 
  'Goregaon East', 'Borivali West', 'Lower Parel', 'Thane West', 'Chembur',
  'Khar West', 'Santacruz', 'Malad West', 'Vile Parle', 'Worli',
  'Navi Mumbai', 'Ghatkopar', 'Mulund', 'Colaba', 'Prabhadevi'
];

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') + `-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function getNextUnpublishedLocality() {
  const { data: existingPosts } = await supabase.from('posts').select('slug');
  const existingSlugs = (existingPosts || []).map((p) => p.slug);

  for (const loc of targetLocalities) {
    const testSlugBase = `best-guitar-classes-in-${loc.toLowerCase().replace(/\s+/g, '-')}-mumbai`;
    const isAlreadyPublished = existingSlugs.some((s) => s.startsWith(testSlugBase));
    if (!isAlreadyPublished) {
      return loc;
    }
  }
  // Fallback to random locality if all initial queued localities are already generated
  return targetLocalities[Math.floor(Math.random() * targetLocalities.length)];
}

async function generatePremiumPost() {
  const locality = await getNextUnpublishedLocality();
  console.log(`Starting generation for locality: ${locality}`);

  const prompt = `You are a professional music educator and local Mumbai music journalist. Write an exhaustive, highly engaging, premium 1200+ word guide on learning guitar in ${locality}, Mumbai.

Requirements for Search Engine Ranking:
1. Title: Create an enticing, high-CTR main H1 header.
2. Structure:
   - Detailed introduction on music culture in ${locality} with specific local landmarks or transit references.
   - Comprehensive comparison between 1-on-1 Doorstep Home Tutors vs local academies in ${locality}. Include a markdown comparison table covering Fees, Flexibility, and Personalized Feedback.
   - Realistic Fee Structure in INR for ${locality} (Beginner vs Intermediate levels).
   - Recommended 4-Week Acoustic Guitar Starter Roadmap for adults and kids.
   - 4-5 Frequently Asked Questions (FAQ section) with direct answers.
3. Tone: Authoritative, helpful, warm, and hyper-local to Mumbai. Avoid repetitive fluff; focus on actionable insights.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You create expert-level, authoritative local educational content formatted in clean Markdown.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
    });

    const rawMarkdown = chatCompletion.choices[0]?.message?.content || '';
    const selectedImage = guitarImages[Math.floor(Math.random() * guitarImages.length)];
    
    // Attach hero image at top of Markdown content
    const content = `![Guitar Coaching in ${locality}](${selectedImage})\n\n${rawMarkdown}`;
    const title = `Best Guitar Classes in ${locality}, Mumbai: 2026 Complete Guide`;
    const slug = generateSlug(`best-guitar-classes-in-${locality}-mumbai`);

    const { error } = await supabase
      .from('posts')
      .insert([
        { 
          title, 
          slug, 
          content,
          post_type: 'post',
          anchor_type: 'local'
        }
      ]);

    if (error) {
      console.error(`Database insert error for ${locality}:`, error.message);
    } else {
      console.log(`[Success] Published premium guide for ${locality} (Slug: ${slug})`);
    }
  } catch (err) {
    console.error(`Failed generation for ${locality}:`, err.message);
  }
}

generatePremiumPost();