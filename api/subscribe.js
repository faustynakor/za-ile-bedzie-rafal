const crypto = require('crypto');
const fetch = require('node-fetch'); // jeśli nie masz, usuń i użyj global fetch w Node 18+
const { get, getAll } = require('@vercel/edge-config');

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;

function keyFromEndpoint(endpoint) {
  // krótkie, bezpieczne ID na podstawie endpointu
  return 'push:sub:' + crypto.createHash('sha1').update(endpoint).digest('hex');
}

async function edgeConfigPatch(items) {
  // zapis do Edge Config przez REST API (PATCH batch items)
  // https://api.vercel.com/v1/edge-config/{edgeConfigId}/items
  const url = `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items })
  });
  if (!res.ok) throw new Error(`EdgeConfig PATCH failed: ${res.status} ${await res.text()}`);
  return res.json();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Brak subscription.endpoint' });

    const key = keyFromEndpoint(sub.endpoint);

    // pobierz aktualny indeks (lista kluczy)
    const { index = [] } = await getAll(['index']) || {};
    const newIndex = Array.isArray(index) ? index.slice() : [];
    if (!newIndex.includes(key)) newIndex.push(key);

    // wykonaj jedną mutację: upsert sub + upsert index
    await edgeConfigPatch([
      { operation: 'upsert', key, value: sub },
      { operation: 'upsert', key: 'index', value: newIndex }
    ]);

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('subscribe_failed', e);
    res.status(500).json({ error: 'subscribe_failed' });
  }
};
