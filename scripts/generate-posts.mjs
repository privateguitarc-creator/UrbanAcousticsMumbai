import { createClient } from '@supabase/supabase-js';
import Groq from '@groq/sdk';
import 'dotenv/config';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// List of target Mumbai neighborhoods to generate guides for
const localities = [
  'Bandra West',
  'Juhu',
  'Powai',
  'Dadar West',
  'Thane West',
  'Goregaon East',
  'Worli'
];

async function generateArticle(locality) {
  console.log(`Generating article for: ${locality}...`);

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

  const content = chatCompletion.choices[0]?.message?.content || '';
  const title = `Top 3 Options for Learning Guitar in ${locality} (2026 Guide)`;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-') + `-${Math.floor(1000 + Math.random() * 9000)}`;

  return { title, slug, content };
}

async function run() {
  for (const locality of localities) {
    try {
      const post = await generateArticle(locality);

      const { data, error } = await supabase
        .from('posts')
        .insert([{ title: post.title, slug: post.slug, content: post.content }]);

      if (error) {
        console.error(`Error inserting ${locality}:`, error.message);
      } else {
        console.log(`Successfully published: ${post.title}`);
      }
    } catch (err) {
      console.error(`Failed to generate for ${locality}:`, err);
    }
  }
  console.log('\nBatch generation complete!');
}

run();