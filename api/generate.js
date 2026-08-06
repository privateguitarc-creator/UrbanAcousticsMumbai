import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!supabaseUrl || !supabaseKey || !groqKey) {
      return res.status(500).json({ error: 'Missing environment variables on Vercel' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const groq = new Groq({ apiKey: groqKey });

    const { data: locations } = await supabase.from('locations').select('*');
    const { data: authors } = await supabase.from('authors').select('*');

    if (!locations || locations.length === 0) {
      return res.status(400).json({ error: 'No locations found in Supabase' });
    }

    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const randomAuthor = authors && authors.length > 0 ? authors[Math.floor(Math.random() * authors.length)] : null;

    const prompt = `Write a high-quality, localized SEO guide for learning guitar in ${randomLoc.name}, Mumbai for 2026. Return strictly a raw JSON object with keys: "title", "slug", "excerpt", "content", and "faqs" (array of {question, answer}).`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const generated = JSON.parse(completion.choices[0].message.content);
    const uniqueSlug = `${generated.slug}-${Math.floor(1000 + Math.random() * 9000)}`;

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

    return res.status(200).json({ success: true, post: insertedPost[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}