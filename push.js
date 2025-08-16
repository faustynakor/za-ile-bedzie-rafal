// push.js
async function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

async function enablePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Twoja przeglądarka nie wspiera powiadomień Web Push.');
      return;
    }

    // Uwaga: ścieżka **bez wiodącego /**, scope lokalny, żeby uniknąć 404
    const reg = await navigator.serviceWorker.register('service-worker.js', { scope: './' });

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Aby otrzymywać powiadomienia, zezwól na nie.');
      return;
    }

    const applicationServerKey = await urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY);
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });

    // wyślij subskrypcję do funkcji na Vercel
    await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub })
    });

    alert('Subskrypcja gotowa! Wysłaliśmy testowe powiadomienie.');
  } catch (e) {
    console.error(e);
    alert('Nie udało się włączyć powiadomień: ' + (e && e.message ? e.message : e));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnPush');
  if (btn) btn.addEventListener('click', enablePush);
});
