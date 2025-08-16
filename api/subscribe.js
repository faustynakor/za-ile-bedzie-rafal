// /api/subscribe.js
export const config = { runtime: 'nodejs18.x' };

import crypto from 'node:crypto';

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;       // np. ecfg_xxx (ID, nie connection string)
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;   // Account Settings → Tokens
const EDGE_TEAM_ID = process.env.EDGE_TEAM_ID || '';     // jeśli projekt jest w zespole, podaj teamId (opcjonalnie)

function keyFromEndpoint(endpoint) {
  return 'push:sub:' + crypto.createHash('sha1').update(endpoint).digest('hex');
}

function apiUrl(path, qp = '') {
  const team = EDGE_TEAM_ID ? (qp ? `${qp}&teamId=${EDGE_TEAM_ID}` : `?teamId=${EDGE_TEAM_ID}`) : (qp || '');
  return `https://api.vercel.com${path}${team}`;
}

// GET jednego klucza (tu: "index" – lista kluczy subskrypcji)
async function getIndex() {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, `?key=index`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
  if (res.status === 404) return [];               // brak index → startujemy od pustej listy
  if (!res.ok) throw new Error(`GET index ${res.status} ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json?.items?.[0]?.value) ? json.items[0].value : [];
}

// PATCH batch (upsert/delete)
async function patchEdgeConfig(items) {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${VERCEL_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items })
  });
  if (!res.ok) throw new Error(`PATCH ${res.status} ${await res.text()}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    if (!EDGE_CONFIG_ID || !VERCEL_API_TOKEN) {
      return res.status(500).json({ error: 'Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN' });
    }

    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Brak subscription.endpoint' });

    const key = keyFromEndpoint(sub.endpoint);
    const index = await getIndex();
    if (!index.includes(key)) index.push(key);

    await patchEdgeConfig([
      { operation: 'upsert', key, value: sub },
      { operation: 'upsert', key: 'index', value: index }
    ]);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('subscribe_failed', e);
    return res.status(500).json({ error: 'subscribe_failed', message: String(e) });
  }
}
