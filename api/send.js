// api/send.js — Vercel Serverless Function
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:you@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Vercel poda req.body już jako obiekt dla application/json,
// ale na wszelki wypadek wspieramy też string.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { subscription, payload } = body || {};
    if (!subscription) return res.status(400).send('Missing subscription');

    // domyślny payload, jeśli nie podasz własnego
    const msg = payload || {
      title: 'ZA ILE BĘDZIE RAFAŁ',
      body: 'Działa! 🔔 Kliknij, aby wrócić do aplikacji.',
      data: { url: '/' }
    };

    await webpush.sendNotification(subscription, JSON.stringify(msg));
    res.status(200).send('ok');
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || 'Error');
  }
}
