async function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export async function enablePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Twoja przeglądarka nie wspiera Web Push.');
      return null;
    }

    const reg = await navigator.serviceWorker.register('service-worker.js', { scope: './' });

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Musisz zezwolić na powiadomienia.');
      return null;
    }

    const publicKey = 'BBM-HfDVsNm_zJT3VYgA7eWg_jRQrrTTKuvYK7L7_KA-NK2KmkyKM6GB3jeCygYBJm4kOtSxCzLnbdp9SNsytG8';
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: await urlBase64ToUint8Array(publicKey)
    });

    const resp = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      console.error('SUBSCRIBE FAILED', resp.status, txt);
      alert('Błąd subskrypcji push: ' + resp.status);
      return null;
    }
    console.log('[LOG] SUBSCRIBE OK');

    return subscription;
  } catch (e) {
    console.error('enablePush error', e);
    alert('Nie udało się włączyć powiadomień.');
    return null;
  }
}

export async function notifyDateChanged(newDateISO, who = '') {
  try {
    const resp = await fetch('/api/change-date', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ newDateISO, who })
    });
    const text = await resp.text();
    console.log('[LOG] CHANGE-DATE RESP', resp.status, text); 
    if (!resp.ok) throw new Error(text);
  } catch (e) {
    console.error('notifyDateChanged error', e);
  }
}
