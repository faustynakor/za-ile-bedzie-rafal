// /api/subscribe.js (CommonJS, bez import/export)
const crypto = require('crypto');

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;       // np. ecfg_******** (ID, NIE "edge-config://...")
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;   // Account Settings → Tokens (musi mieć dostęp do projektu)
const EDGE_TEAM_ID = process.env.EDGE_TEAM_ID || '';     // jeśli projekt jest w zespole, podaj ID zespołu (opcjonalnie)

function qs(obj) {
  const p = new URLSearchParams(obj);
  const s = p.toString();
  return s ? `?${s}` : '';
}
function apiUrl(path, params) {
  const base = `https://api.vercel.com${path}`;
  const extra = Object.assign({}, params || {});
  if (EDGE_TEAM_ID) extra.teamId = EDGE_TEAM_ID;
  const suffix = qs(extra);
  return `${base}${suffix}`;
}
function keyFromEndpoint(endpoint) {
  return 'push:sub:' + crypto.createHash('sha1').update(endpoint).digest('hex');
}

// pobierz listę kluczy "index"
async function getIndex() {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, { key: 'index' });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
  if (res.status === 404) return []; // brak klucza "index" – start od pustej tablicy
  if (!res.ok) throw new Error(`GET index ${res.status} ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json?.items?.[0]?.value) ? json.items[0].value : [];
}

// batch PATCH (upsert/delete)
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

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // krótka diagnostyka
    return res.status(200).json({
      ok: true,
      env: {
        has_EDGE_CONFIG_ID: Boolean(EDGE_CONFIG_ID),
        looks_like_id: EDGE_CONFIG_ID ? EDGE_CONFIG_ID.startsWith('ecfg_') : null,
        has_VERCEL_API_TOKEN: Boolean(VERCEL_API_TOKEN),
        has_EDGE_TEAM_ID: Boolean(EDGE_TEAM_ID),
      }
    });
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
    const index = await getIndex();
    if (!index.includes(key)) index.push(key);

    await patchEdgeConfig([
      { operation: 'upsert', key, value: sub },
      { operation: 'upsert', key: 'index', value: index }
    ]);

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('subscribe_failed', e);
    res.status(500).json({ error: 'subscribe_failed', message: String(e) });
  }
};
