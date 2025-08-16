const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;
const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const EDGE_TEAM_ID = process.env.EDGE_TEAM_ID || '';

function qs(obj){const p=new URLSearchParams(obj);const s=p.toString();return s?`?${s}`:'';}
function apiUrl(path, params){const base=`https://api.vercel.com${path}`;const extra=Object.assign({},params||{});if(EDGE_TEAM_ID)extra.teamId=EDGE_TEAM_ID;return `${base}${qs(extra)}`;}

async function getIndex(){
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, { key: 'index' });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GET index ${res.status} ${await res.text()}`);
  const arr = await res.json();
  const item = Array.isArray(arr) ? arr.find(x => x?.key === 'index') : null;
  return Array.isArray(item?.value) ? item.value : [];
}

async function getItem(key){
  const url = apiUrl(`/v1/edge-config/${EDGE_CONFIG_ID}/items`, { key });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${key} ${res.status} ${await res.text()}`);
  const arr = await res.json();
  const item = Array.isArray(arr) ? arr.find(x => x?.key === key) : null;
  return item?.value ?? null;
}


module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const index = await getIndex();
    const sample = [];
    for (let i = 0; i < Math.min(3, index.length); i++) {
      const key = index[i];
      const sub = await getItem(key);
      sample.push({ key, hasEndpoint: !!sub?.endpoint, endpointPrefix: sub?.endpoint?.slice(0, 40) || null });
    }
    return res.status(200).json({ ok: true, count: index.length, sample });
  } catch (e) {
    console.error('list-subs failed', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
};
