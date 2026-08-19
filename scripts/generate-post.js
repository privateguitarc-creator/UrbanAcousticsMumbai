// scripts/generate-post.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gxlrjksmttokqnvirlxa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;

// Groq's high-quality model (Free Tier)
const MODEL_NAME = 'openai/gpt-oss-120b';

if (!SUPABASE_KEY || !GROQ_API_KEY) {
  console.error("Missing SUPABASE_KEY or GROQ_API_KEY in environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Connect to Groq Cloud API
const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const POST_TYPES = [
  {
    type: 'roundup',
    titleTemplate: (loc) => `Top 3 Options for Learning Guitar in ${loc.name} (${new Date().getFullYear()} Guide)`,
    promptFocus: 'Compare self-learning, group academies, and doorstep master tuition.'
  },
  {
    type: 'traffic_solution',
    titleTemplate: (loc) => `Why Commuting to Music Academies in ${loc.name} Kills Guitar Progress`,
    promptFocus: 'Discuss traffic delays, energy drain after work/school, and why doorstep instruction solves this.'
  },
  {
    type: 'guide',
    titleTemplate: (loc) => `How to Go From Zero to Playing Songs in 3 Weeks in ${loc.name}`,
    promptFocus: 'A step-by-step 3-week practice roadmap for beginners.'
  },
  {
    type: 'deep_dive',
    titleTemplate: (loc) => `Private Home Guitar Lessons in ${loc.name}: What Parents & Adult Learners Need to Know`,
    promptFocus: 'Safety, one-on-one attention, customized pacing, and chord mechanics.'
  },
  {
    type: 'gear',
    titleTemplate: (loc) => `Best Acoustic Guitars for Beginners Near ${loc.name} & How to Practice Properly`,
    promptFocus: 'Budget guitar recommendations, action height, and local practice habits.'
  }
];

const ANCHOR_STYLES = [
  {
    type: 'exact',
    getAnchor: () => `[Guitar Classes in Mumbai](https://guitar-classes-in-mumbai.vercel.app/)`
  },
  {
    type: 'local',
    getAnchor: (loc) => `[doorstep guitar tuition in ${loc.name}](https://guitar-classes-in-mumbai.vercel.app/)`
  },
  {
    type: 'brand',
    getAnchor: () => `[guitar-classes-in-mumbai.vercel.app](https://guitar-classes-in-mumbai.vercel.app/)`
  },
  {
    type: 'cta',
    getAnchor: () => `[book a dedicated 24-session doorstep masterclass here](https://guitar-classes-in-mumbai.vercel.app/)`
  }
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  console.log(`Starting automated post generation with Groq API using ${MODEL_NAME}...`);

  const { data: locations, error: locError } = await supabase.from('locations').select('*');
  const { data: authors, error: authError } = await supabase.from('authors').select('*');

  if (locError || authError || !locations?.length || !authors?.length) {
    throw new Error("Failed to fetch locations or authors from Supabase.");
  }

  const location = locations[Math.floor(Math.random() * locations.length)];
  const author = authors[Math.floor(Math.random() * authors.length)];

  const postConfig = POST_TYPES[Math.floor(Math.random() * POST_TYPES.length)];
  const anchorConfig = ANCHOR_STYLES[Math.floor(Math.random() * ANCHOR_STYLES.length)];

  const title = postConfig.titleTemplate(location);
  const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;
  const anchorMarkdown = anchorConfig.getAnchor(location);

  const prompt = `
  You are ${author.name}, a ${author.role} based in Mumbai.
  Write a highly detailed, engaging, and professional 1,200-word blog post in Markdown format.

  **ARTICLE DETAILS:**
  - Title: ${title}
  - Location/Neighborhood: ${location.name} (Landmarks: ${location.landmarks})
  - Article Focus: ${postConfig.promptFocus}

  **EDITORIAL MANDATE:**
  1. Write from the perspective of an experienced local music writer in Mumbai. Mention landmarks like ${location.landmarks} naturally.
  2. Explain the physical challenges of learning guitar (finger soreness, rhythm timing, switching open chords).
  3. Address the reality of Mumbai travel time (SV Road, Link Road, Western Express Highway traffic) and why doorstep instruction solves this.
  4. In the middle of the article (under an appropriate H2 heading), seamlessly embed this EXACT markdown link into a sentence:
     ${anchorMarkdown}
  5. Include 4–5 H2 sections, bullet points, and practical tips.
  6. DO NOT sound like cheap AI sales copy. Write like an encyclopedic, informative local publication.

  Provide output starting directly with the H1 title (# Title).
  `;

  const completion = await groq.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      { role: "system", content: "You are an expert music educator and local Mumbai journalist writing high-quality blog content." },
      { role: "user", content: prompt }
    ],
  });

  const rawText = completion.choices[0].message.content;

  const summaryCompletion = await groq.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      { role: "system", content: "You are an SEO expert. Output ONLY the 2-sentence meta description. Do NOT include conversational intros like 'Here is a summary', setups, or quote marks." },
      { role: "user", content: `Summarize this article in 2 clear sentences for a search engine meta description:\n\n${rawText.slice(0, 1000)}` }
    ],
  });
  
  let summary = summaryCompletion.choices[0].message.content.trim();
  // Strip out any accidental prefix if the model still includes it
  summary = summary.replace(/^(here is|here's|this is)[^:]*:\s*/i, '').replace(/^["']|["']$/g, '');

  const imageUrl = `https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=1200&q=80`;

  const { data: insertedPost, error: insertError } = await supabase.from('posts').insert({
    title,
    slug,
    summary,
    content: rawText,
    featured_image: imageUrl,
    location_id: location.id,
    author_id: author.id,
    post_type: postConfig.type,
    anchor_type: anchorConfig.type,
    published_at: new Date().toISOString()
  }).select().single();

  if (insertError) {
    console.error("Supabase Insert Error:", insertError);
  } else {
    console.log(`\n✅ Successfully published post to Supabase!`);
    console.log(`Title: "${title}"`);
    console.log(`Author: ${author.name} | Location: ${location.name}`);
  }
}

run().catch(console.error);