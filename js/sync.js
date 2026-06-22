/**
 * Strong & Lean — Storage + Sync layer
 *
 * API_BASE: point at your backend (Cloudflare Workers or Supabase)
 * - Cloudflare Workers (current): relative path /api/*
 * - Supabase (future): https://YOUR_PROJECT.supabase.co/rest/v1/*
 *   Change API_BASE and add Authorization + apikey headers to apiFetch()
 *
 * ── Supabase migration checklist ──────────────────────────────────────────
 * 1. Change API_BASE to 'https://YOUR_PROJECT.supabase.co/rest/v1'
 * 2. Add to apiFetch() headers:
 *      { 'Authorization': 'Bearer SUPABASE_ANON_KEY', 'apikey': 'SUPABASE_ANON_KEY' }
 * 3. Rename endpoints to match Supabase PostgREST:
 *      /session  → /sessions
 *      /daily    → /daily_logs
 *      /prs      → /prs  (same)
 * 4. Supabase returns arrays directly on GET; adjust .json() parsing in pull()
 *    (remove the .results wrapper assumption — already not used here)
 * ─────────────────────────────────────────────────────────────────────────
 */
const API_BASE = '/api';

function apiFetch(path, opts = {}) {
  // Supabase migration: add headers here:
  //   headers: { 'Authorization': 'Bearer ' + SUPABASE_KEY, 'apikey': SUPABASE_KEY }
  return fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  }).catch(() => null); // always fail silently — localStorage is the source of truth offline
}

const SL = {
  // ── localStorage helpers (single source of truth for UI) ──
  get(k)      { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v)   { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },

  // ── Session history ──
  getHistory()       { return this.get('sl_history') || []; },
  addSession(sess)   {
    const history = this.getHistory();
    // replace if same id, else prepend
    const idx = history.findIndex(s => s.id === sess.id);
    if (idx >= 0) history[idx] = sess; else history.unshift(sess);
    this.set('sl_history', history);
    // sync to server
    apiFetch('/session', { method: 'POST', body: JSON.stringify(sess) });
  },

  // ── Daily metrics ──
  getDaily(date)        { return { protein: this.get('sl_prot_'+date)||0, calories: this.get('sl_cal_'+date)||0, weight: this.get('sl_wt_'+date)||null }; },
  saveProtein(date, v)  { this.set('sl_prot_'+date, v); this._syncDaily(date); },
  saveCalories(date, v) { this.set('sl_cal_'+date, v); this._syncDaily(date); },
  saveWeight(date, v)   { this.set('sl_wt_'+date, v);  this._syncDaily(date); },
  _syncDaily(date)      {
    const d = this.getDaily(date);
    apiFetch('/daily', { method: 'POST', body: JSON.stringify({ date, ...d }) });
  },

  // ── PRs ──
  getPRs()             { return this.get('sl_prs') || {}; },
  savePR(exId, w, r)   {
    const prs = this.getPRs();
    prs[exId] = { topWeight: w, repsAtTop: r };
    this.set('sl_prs', prs);
    apiFetch('/prs', { method: 'POST', body: JSON.stringify({ exercise_id: exId, top_weight: w, reps_at_top: r }) });
  },

  // ── Pull from server and merge into localStorage (called on page load) ──
  async pull() {
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Sessions: server wins — it has the authoritative history across devices
      const sessRes = await apiFetch('/session?days=60');
      if (sessRes?.ok) {
        const serverSessions = await sessRes.json();
        if (Array.isArray(serverSessions) && serverSessions.length) {
          this.set('sl_history', serverSessions);
        }
      }

      // Daily: merge (server wins per field if local is 0/null)
      const dailyRes = await apiFetch('/daily?date=' + today);
      if (dailyRes?.ok) {
        const srv = await dailyRes.json();
        if (srv.protein  && !this.get('sl_prot_'+today)) this.set('sl_prot_'+today, srv.protein);
        if (srv.calories && !this.get('sl_cal_'+today))  this.set('sl_cal_'+today, srv.calories);
        if (srv.weight   && !this.get('sl_wt_'+today))   this.set('sl_wt_'+today, srv.weight);
      }

      // PRs: merge (server wins per exercise if local doesn't have it)
      const prRes = await apiFetch('/prs');
      if (prRes?.ok) {
        const srvPrs = await prRes.json();
        const localPrs = this.getPRs();
        let changed = false;
        Object.entries(srvPrs).forEach(([id, val]) => {
          if (!localPrs[id]) { localPrs[id] = val; changed = true; }
        });
        if (changed) this.set('sl_prs', localPrs);
      }
    } catch {}
  }
};

if (typeof window !== 'undefined') window.SL = SL;
