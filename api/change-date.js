const fetch = require('node-fetch');
const { get, getAll } = require('@vercel/edge-config');
const webpush = require('web-push');

const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;

function initWebPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('Brak kluczy VAPID w ENV');
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function edgeConfigPatch(items) {
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
    initWebPush();

    const { newDateISO, who } = req.body || {};
    if (!newDateISO) return res.status(400).json({ error: 'Brak newDateISO' });

    // pobierz listę kluczy (index) i — opcjonalnie — wiele subskrypcji naraz
    const { index = [] } = await getAll(['index']) || {};
    if (!Array.isArray(index) || index.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, removed: 0 });
    }

    // pobierz wszystkie suby w jednym żądaniu (getAll liczy się jako jeden read)
    // https://github.com/vercel/next.js/discussions/49698
    const subs = await getAll(index);

    let sent = 0, removed = 0;
    const deadKeys = [];

    await Promise.all(index.map(async (k) => {
      const sub = subs[k];
      if (!sub) { deadKeys.push(k); return; }

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
        // 404/410 = martwa subskrypcja — do usunięcia
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          deadKeys.push(k);
          removed++;
        } else {
          console.error('Push error:', err?.statusCode, err?.body || err);
        }
      }
    }));

    // jeśli są martwe wpisy — usuń z Edge Config (sub + indeks)
    if (deadKeys.length) {
      const newIndex = index.filter(k => !deadKeys.includes(k));
      const mutations = deadKeys.map(k => ({ operation: 'delete', key: k }));
      mutations.push({ operation: 'upsert', key: 'index', value: newIndex });
      await edgeConfigPatch(mutations);
    }

    return res.status(200).json({ ok: true, sent, removed });
  } catch (e) {
    console.error('broadcast_failed', e);
    return res.status(500).json({ error: 'broadcast_failed' });
  }
};
