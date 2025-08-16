const crypto = require('crypto');

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const EDGE_TEAM_ID = process.env.EDGE_TEAM_ID || '';

function qs(obj) {
  const p = new URLSearchParams(obj);
  const s = p.toString();
  return s ? `?${s}` : '';
}
function apiUrl(path, params) {
  const base = `https://api.vercel.com${path}`;
  const extra = Object.assign({}, params || {});
  if (EDGE_TEAM_ID) extra.teamId = EDGE_TEAM_ID;
  return `${base}${qs(extra)}`;
}

function keyFromEndpoint(endpoint) {
  return 'push-sub-' + crypto.createHash('sha1').update(endpoint).digest('hex');
}

async function readJson(req) {
  try {
    if (req.body && typeof req.body === 'object') return req.body; // na wypadek, gdy parser działa
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8') || '{}';
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getIndex() {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, { key: 'index' });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
  if (res.status === 404) return []; // klucz "index" nie istnieje
  if (!res.ok) throw new Error(`GET index ${res.status} ${await res.text()}`);
  const arr = await res.json(); // <-- Vercel zwraca TABLICĘ
  // szukamy elementu z key === 'index' i bierzemy jego value (powinna być tablica stringów)
  const item = Array.isArray(arr) ? arr.find(x => x?.key === 'index') : null;
  return Array.isArray(item?.value) ? item.value : [];
}


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
  if (req.method !== 'POST') return res.status(405).end();

  try {
    if (!EDGE_CONFIG_ID || !VERCEL_API_TOKEN) {
      return res.status(500).json({ error: 'Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN' });
    }

    const sub = await readJson(req);
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
