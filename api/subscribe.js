// /api/subscribe.js — DIAGNOZA ZAPISU (PATCH)
const crypto = require('crypto');

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const EDGE_TEAM_ID = process.env.EDGE_TEAM_ID || '';

function qs(obj) { const p = new URLSearchParams(obj); const s = p.toString(); return s ? `?${s}` : ''; }
function apiUrl(path, params) {
  const base = `https://api.vercel.com${path}`;
  const extra = Object.assign({}, params || {});
  if (EDGE_TEAM_ID) extra.teamId = EDGE_TEAM_ID;
  return `${base}${qs(extra)}`;
}

async function getIndexProbe() {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, { key: 'index' });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: safeJson(text) };
}

async function patchProbe() {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`);
  const body = { items: [{ operation: 'upsert', key: 'healthcheck', value: { ts: Date.now() } }] };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${VERCEL_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: safeJson(text) };
}

function safeJson(text) { try { return JSON.parse(text); } catch { return { raw: text }; } }
function keyFromEndpoint(endpoint) { return 'push:sub:' + crypto.createHash('sha1').update(endpoint).digest('hex'); }

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const env = {
        has_EDGE_CONFIG_ID: !!EDGE_CONFIG_ID,
        looks_like_id: EDGE_CONFIG_ID ? EDGE_CONFIG_ID.startsWith('ecfg_') : null,
        has_VERCEL_API_TOKEN: !!VERCEL_API_TOKEN,
        has_EDGE_TEAM_ID: !!EDGE_TEAM_ID
      };
      const indexProbe = await getIndexProbe();
      const writeProbe = await patchProbe();   // << test zapisu
      return res.status(200).json({ ok: true, env, indexProbe, writeProbe });
    } catch (e) {
      return res.status(200).json({ ok: false, error: String(e) });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();

  try {
    if (!EDGE_CONFIG_ID || !VERCEL_API_TOKEN) {
      return res.status(500).json({ error: 'Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN' });
    }
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Brak subscription.endpoint' });

    // normalny zapis (jak wcześniej)
    const idxUrl = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, { key: 'index' });
    const idxRes = await fetch(idxUrl, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
    let index = [];
    if (idxRes.ok) {
      const j = await idxRes.json();
      index = Array.isArray(j?.items?.[0]?.value) ? j.items[0].value : [];
    } else if (idxRes.status !== 404) {
      const t = await idxRes.text(); throw new Error(`GET index ${idxRes.status} ${t}`);
    }

    const key = keyFromEndpoint(sub.endpoint);
    if (!index.includes(key)) index.push(key);

    const patchUrl = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`);
    const patchBody = { items: [
      { operation: 'upsert', key, value: sub },
      { operation: 'upsert', key: 'index', value: index }
    ]};
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody)
    });
    if (!patchRes.ok) throw new Error(`PATCH ${patchRes.status} ${await patchRes.text()}`);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('subscribe_failed', e);
    return res.status(500).json({ error: 'subscribe_failed', message: String(e) });
  }
};
