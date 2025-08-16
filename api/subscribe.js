// /api/subscribe.js (diagnostyka)
export const config = { runtime: 'nodejs18.x' };

import crypto from 'node:crypto';

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;       // musi wyglądać jak: ecfg_********
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;   // personal token z Account Settings → Tokens
const EDGE_TEAM_ID = process.env.EDGE_TEAM_ID || '';     // jeśli projekt jest w zespole, podaj teamId (opcjonalnie)

function apiUrl(path, qp = '') {
  const team = EDGE_TEAM_ID ? (qp ? `${qp}&teamId=${EDGE_TEAM_ID}` : `?teamId=${EDGE_TEAM_ID}`) : (qp || '');
  return `https://api.vercel.com${path}${team}`;
}

function keyFromEndpoint(endpoint) {
  return 'push:sub:' + crypto.createHash('sha1').update(endpoint).digest('hex');
}

// prosty GET do sprawdzenia ustawień i dostępu
async function testGetIndex() {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, `?key=index`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: safeJson(text) };
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function patchEdge(items) {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${VERCEL_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH ${res.status} ${text}`);
  return safeJson(text);
}

export default async function handler(req, res) {
  // DIAGNOSTYKA: GET pokaże co jest nie tak (ENV, ID, uprawnienia, teamId)
  if (req.method === 'GET') {
    const envHints = {
      has_EDGE_CONFIG_ID: Boolean(EDGE_CONFIG_ID),
      looks_like_connection_string: EDGE_CONFIG_ID ? EDGE_CONFIG_ID.startsWith('edge-config://') : null,
      EDGE_CONFIG_ID_sample: EDGE_CONFIG_ID ? EDGE_CONFIG_ID.slice(0, 12) + '...' : null,
      has_VERCEL_API_TOKEN: Boolean(VERCEL_API_TOKEN),
      has_EDGE_TEAM_ID: Boolean(EDGE_TEAM_ID),
    };
    try {
      if (!EDGE_CONFIG_ID || !VERCEL_API_TOKEN) {
        return res.status(200).json({ ok: false, reason: 'Missing ENV', envHints });
      }
      const indexProbe = await testGetIndex();
      return res.status(200).json({ ok: true, envHints, indexProbe });
    } catch (e) {
      return res.status(200).json({ ok: false, error: String(e), envHints });
    }
  }

  if (req.method !== 'POST') return res.status(405).end();

  try {
    if (!EDGE_CONFIG_ID || !VERCEL_API_TOKEN) {
      return res.status(500).json({ error: 'Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN' });
    }

    const sub = req.body;
    if (!sub || !sub.endpoint) {
      return res.status(400).json({ error: 'Brak subscription.endpoint' });
    }

    const key = keyFromEndpoint(sub.endpoint);

    // pobierz aktualny index (może nie istnieć)
    const idxRes = await fetch(
      apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, `?key=index`),
      { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } }
    );
    let index = [];
    if (idxRes.ok) {
      const j = await idxRes.json();
      index = Array.isArray(j?.items?.[0]?.value) ? j.items[0].value : [];
    } else if (idxRes.status !== 404) {
      const t = await idxRes.text();
      throw new Error(`GET index ${idxRes.status} ${t}`);
    }

    if (!index.includes(key)) index.push(key);

    await patchEdge([
      { operation: 'upsert', key, value: sub },
      { operation: 'upsert', key: 'index', value: index }
    ]);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('subscribe_failed', e);
    return res.status(500).json({ error: 'subscribe_failed', message: String(e) });
  }
}
