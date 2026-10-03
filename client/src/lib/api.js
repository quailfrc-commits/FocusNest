/* 後端位址：網頁版由同一台伺服器提供，所以預設用相對路徑；
   APK／EXE 要在設定裡填電腦的區網位址，例如 http://SERVER_IP:3000 */
const LS_SERVER = 'focusnest-server';
export function getServer(){
  if(location.protocol === 'file:') return import.meta.env.VITE_API_BASE || 'http://localhost:3000';
  try{ const v = localStorage.getItem(LS_SERVER); if(v) return v; }catch(e){}
  return import.meta.env.VITE_API_BASE || '';
}
export function setServer(v){ try{ localStorage.setItem(LS_SERVER, v.trim().replace(/\/+$/, '')); }catch(e){} }

/* 登入憑證存在 focusnest-session（store.jsx 管理），每個請求自動帶上 */
function token(){ try{ return (JSON.parse(localStorage.getItem('focusnest-session') || 'null') || {}).token || ''; }catch(e){ return ''; } }

async function call(method, path, body, timeout = 8000){
  const t = token();
  const r = await fetch(getServer() + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout)
  });
  const data = await r.json().catch(() => ({}));
  if(!r.ok) throw Object.assign(new Error(data.error || 'http_' + r.status), { status: r.status });
  return data;
}

export const api = {
  health: () => call('GET', '/api/health', null, 4000),
  register: (username, password) => call('POST', '/api/auth/register', { username, password }),
  login: (username, password) => call('POST', '/api/auth/login', { username, password }),
  demo: () => call('POST', '/api/auth/demo'),
  logout: () => call('POST', '/api/auth/logout'),
  getState: () => call('GET', '/api/state'),
  putState: state => call('PUT', '/api/state', { state }),
  putLive: status => call('PUT', '/api/live', status, 3000),
  getLive: () => call('GET', '/api/live', null, 3000),
  split: title => call('POST', '/api/ai/split', { title }, 25000),
  diary: payload => call('POST', '/api/ai/diary', payload, 25000)
};
