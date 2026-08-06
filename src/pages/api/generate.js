import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

export const prerender = false; // Ensure SSR dynamic execution

export async function GET({ request }) {
  // Optional: Verify Vercel Cron Secret for security
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!supabaseUrl || !supabaseKey || !groqKey) {
      throw new Error('Missing required environment variables on Vercel.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const groq = new Groq({ apiKey: groqKey });

    // 1. Fetch available locations and authors from Supabase
    const { data: locations } = await supabase.from('locations').select('*');
    const { data: authors } = await supabase.from('authors').select('*');

    if (!locations || locations.length === 0) {
      return new Response(JSON.stringify({ message: 'No locations available' }), { status: 400 });
    }

    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const randomAuthor = authors && authors.length > 0 ? authors[Math.floor(Math.random() * authors.length)] : null;

    // 2. Generate post content via Groq API
    const prompt = `Write a high-quality, localized SEO guide for learning guitar in ${randomLoc.name}, Mumbai for 2026. 
    Return strictly a raw JSON object with keys: "title", "slug", "excerpt", "content", and "faqs" (array of {question, answer}).`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const generated = JSON.parse(completion.choices[0].message.content);
    const uniqueSlug = `${generated.slug}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Insert new post into Supabase
    const { data: insertedPost, error: insertError } = await supabase
      .from('posts')
      .insert([
        {
          title: generated.title,
          slug: uniqueSlug,
          excerpt: generated.excerpt,
          content: generated.content,
          faqs: generated.faqs || [],
          location_id: randomLoc.id,
          author_id: randomAuthor ? randomAuthor.id : null,
          published_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, post: insertedPost[0] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}