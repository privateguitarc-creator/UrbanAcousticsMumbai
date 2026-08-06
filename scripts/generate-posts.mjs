import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import 'dotenv/config';

// Reads either PUBLIC_ or standard Supabase secret names
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, process.env.PUBLIC_SUPABASE_ANON_KEY || supabaseKey);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// List of target localities in Mumbai
const localities = [
  'Bandra West',
  'Juhu',
  'Powai',
  'Dadar West',
  'Thane West',
  'Goregaon East',
  'Worli',
  'Malad West',
  'Chembur',
  'Vashi'
];

// High-resolution royalty-free guitar images
const guitarImages = [
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?auto=format&fit=crop&w=1200&q=80'
];

async function generateArticle(locality) {
  console.log(`Generating article with image for: ${locality}...`);

  const prompt = `
Write a comprehensive, SEO-optimized guide titled "Top 3 Options for Learning Guitar in ${locality} (2026 Guide)".
Target audience: Beginners and enthusiasts looking for guitar tutors or classes in ${locality}, Mumbai.

Format the output strictly in Markdown with these guidelines:
1. Include an intro describing learning guitar in ${locality} with reference to local landmarks or culture.
2. Outline 3 learning paths: Self-learning, Local music academies, and Doorstep masterclasses.
3. Highlight doorstep masterclass tuition as the top choice for convenience.
4. Naturally insert an anchor link with text "book a dedicated 24-session doorstep masterclass here" pointing to: https://guitar-classes-in-mumbai.vercel.app/
5. Include a conclusion.
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
  });

  const rawMarkdown = chatCompletion.choices[0]?.message?.content || '';
  
  // Attach a random guitar image to the top of the article
  const randomImage = guitarImages[Math.floor(Math.random() * guitarImages.length)];
  const imageHeader = `![Guitar Classes in ${locality}](${randomImage})\n\n`;
  const content = imageHeader + rawMarkdown;

  const title = `Top 3 Options for Learning Guitar in ${locality} (2026 Guide)`;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-') + `-${Math.floor(1000 + Math.random() * 9000)}`;

  return { title, slug, content };
}

async function run() {
  const locality = localities[Math.floor(Math.random() * localities.length)];
  
  try {
    const post = await generateArticle(locality);

    const { error } = await supabase
      .from('posts')
      .insert([{ title: post.title, slug: post.slug, content: post.content }]);

    if (error) {
      console.error(`Error inserting ${locality}:`, error.message);
    } else {
      console.log(`Successfully published: ${post.title}`);
    }
  } catch (err) {
    console.error(`Failed generation for ${locality}:`, err);
  }
}

run();