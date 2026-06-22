export async function onRequest(ctx) {
  const { request, env } = ctx;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const days = parseInt(url.searchParams.get('days') || '60');
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { results } = await env.DB.prepare(
        "SELECT * FROM sessions WHERE user_id='ryan' AND date >= ? ORDER BY date DESC"
      ).bind(cutoff).all();
      // Parse exercises JSON string back to object
      const sessions = results.map(r => ({ ...r, exercises: r.exercises ? JSON.parse(r.exercises) : [] }));
      return new Response(JSON.stringify(sessions), { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { id, date, name, exercises, volume, sets } = body;
      await env.DB.prepare(
        "INSERT OR REPLACE INTO sessions (id, user_id, date, name, exercises, volume, sets) VALUES (?, 'ryan', ?, ?, ?, ?, ?)"
      ).bind(id, date, name, JSON.stringify(exercises), volume || 0, sets || 0).run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response('Method not allowed', { status: 405, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
