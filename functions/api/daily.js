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
      const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
      const row = await env.DB.prepare(
        "SELECT * FROM daily_logs WHERE user_id='ryan' AND date=?"
      ).bind(date).first();
      return new Response(JSON.stringify(row || { date, protein: 0, calories: 0, weight: null }), { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { date, protein, calories, weight } = body;
      await env.DB.prepare(
        "INSERT INTO daily_logs (user_id, date, protein, calories, weight, updated_at) VALUES ('ryan', ?, ?, ?, ?, datetime('now')) ON CONFLICT(user_id, date) DO UPDATE SET protein=excluded.protein, calories=excluded.calories, weight=COALESCE(excluded.weight, weight), updated_at=excluded.updated_at"
      ).bind(date, protein ?? 0, calories ?? 0, weight ?? null).run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response('Method not allowed', { status: 405, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
