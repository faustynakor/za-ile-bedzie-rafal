// /api/change-date.js (CommonJS)
const webpush = require('web-push');

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
  const suffix = qs(extra);
  return `${base}${suffix}`;
}

async function getIndex() {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, { key: 'index' });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GET index ${res.status} ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json?.items?.[0]?.value) ? json.items[0].value : [];
}

async function getItem(key) {
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, { key });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${key} ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json?.items?.[0]?.value ?? null;
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

function initWebPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY');
  }
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    if (!EDGE_CONFIG_ID || !VERCEL_API_TOKEN) {
      return res.status(500).json({ error: 'Missing EDGE_CONFIG_ID or VERCEL_API_TOKEN' });
    }
    initWebPush();

    const { newDateISO, who } = req.body || {};
    if (!newDateISO) return res.status(400).json({ error: 'Brak newDateISO' });

    const index = await getIndex();
    if (!index.length) return res.status(200).json({ ok: true, sent: 0, removed: 0 });

    let sent = 0, removed = 0;
    const deadKeys = [];

    await Promise.all(index.map(async (key) => {
      const sub = await getItem(key);
      if (!sub) { deadKeys.push(key); return; }

      const payload = JSON.stringify({
        title: 'Data została zmieniona',
        body: `${who ? `${who} ustawił(a) nową datę: ` : 'Nowa data: '}${newDateISO}`,
        tag: 'date-changed',
        data: { newDateISO }
      });

      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          deadKeys.push(key); removed++;
        } else {
          console.error('Push error:', err?.statusCode, err?.body || err);
        }
      }
    }));

    if (deadKeys.length) {
      const newIndex = index.filter(k => !deadKeys.includes(k));
      const mutations = deadKeys.map(k => ({ operation: 'delete', key: k }));
      mutations.push({ operation: 'upsert', key: 'index', value: newIndex });
      await patchEdgeConfig(mutations);
    }

    return res.status(200).json({ ok: true, sent, removed });
  } catch (e) {
    console.error('broadcast_failed', e);
    return res.status(500).json({ error: 'broadcast_failed', message: String(e) });
  }
};
