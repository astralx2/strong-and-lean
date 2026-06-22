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
      const { results } = await env.DB.prepare(
        "SELECT exercise_id, top_weight, reps_at_top FROM prs WHERE user_id='ryan'"
      ).all();
      // Return as { exercise_id: { topWeight, repsAtTop } } object matching sl_prs format
      const prs = {};
      results.forEach(r => { prs[r.exercise_id] = { topWeight: r.top_weight, repsAtTop: r.reps_at_top }; });
      return new Response(JSON.stringify(prs), { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { exercise_id, top_weight, reps_at_top } = body;
      await env.DB.prepare(
        "INSERT INTO prs (user_id, exercise_id, top_weight, reps_at_top, updated_at) VALUES ('ryan', ?, ?, ?, datetime('now')) ON CONFLICT(user_id, exercise_id) DO UPDATE SET top_weight=excluded.top_weight, reps_at_top=excluded.reps_at_top, updated_at=excluded.updated_at"
      ).bind(exercise_id, top_weight, reps_at_top).run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response('Method not allowed', { status: 405, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
