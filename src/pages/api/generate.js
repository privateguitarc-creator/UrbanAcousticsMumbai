export const prerender = false;

export async function GET() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Automated publishing is paused pending editorial and Search Console review.'
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    }
  );
}
