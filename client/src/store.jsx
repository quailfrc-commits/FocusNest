import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { seed, demoState, STATE_VERSION } from './lib/data.js';
import { api } from './lib/api.js';
import { today } from './lib/util.js';

/* 狀態 S 先存在本機（離線可用），登入後整包同步到 PostgreSQL。
   每個帳號在這台裝置上各有一份本機資料；衝突處理：最後寫入的覆蓋（Demo 同時只有一台裝置在改，夠用）。
   session：{ username, demo, offline, token }
     - 一般帳號：username＋token（連得上後端）
     - 展示帳號 admin：demo:true，連得上後端時有 token，連不上時 offline:true 照樣能展示
     - 離線使用：offline:true、demo:false，資料只存在這台裝置（沿用舊的存檔 key，原本的資料不會不見） */
const LS_UI = 'focusnest-ui', LS_SESSION = 'focusnest-session', LS_LEGACY = 'focusnest-state-v2';
const POLL_MS = 5000;

const read = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(e){ return d; } };
const write = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } };
const stateKey = s => s.offline && !s.demo ? LS_LEGACY : LS_LEGACY + ':' + s.username + (s.offline ? '-offline' : '');
const syncKey = s => 'focusnest-synced-at:' + s.username;

function saveState(S, sess){
  if(!sess) return;
  const key = stateKey(sess);
  if(write(key, S)) return;
  // 空間不夠時，先丟掉較舊的成果照
  if(S.proofs.length > 2){ S.proofs.splice(0, S.proofs.length - 2); write(key, S); }
}
function rollDaily(s){
  const T = today();
  s.tasks.forEach(t => {
    if(t.type === 'daily' && t.doneOn !== T) Object.assign(t, { status: 'todo', start: T, due: T, pomo: 0, spentMin: 0, proof: null });
    if(t.type === 'daily' && !t.logs) t.logs = [];
  });
  return s;
}
function loadState(sess){
  const s = read(stateKey(sess), null);
  if(s && s.v === STATE_VERSION) return rollDaily(s);
  const fresh = sess.demo ? demoState() : seed();
  if(!sess.demo && !sess.offline) fresh.user.name = sess.username;
  saveState(fresh, sess); // 第一次開啟就存檔，新手保護的起算日才不會每天重設
  return fresh;
}

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }){
  const [session, setSessionState] = useState(() => read(LS_SESSION, null));
  const [S, setS] = useState(() => { const sess = read(LS_SESSION, null); return sess ? loadState(sess) : seed(); });
  const [ui, setUi] = useState(() => {
    const tab = new URLSearchParams(location.search).get('tab'); // 網址 ?tab=tasks 可以直接指定分頁（對照頁、除錯用）
    return { tab: 'home', ttype: 'daily', plan: 'matrix', ...read(LS_UI, {}), ...(['home', 'tasks', 'plan', 'equip', 'group', 'settings'].includes(tab) ? { tab } : {}) };
  });
  const [sync, setSync] = useState('offline'); // offline | nodb | syncing | synced
  const ref = useRef(S), sess = useRef(session), dirty = useRef(false), pushTimer = useRef(null);
  ref.current = S; sess.current = session;

  const replace = useCallback(next => { ref.current = next; setS(next); saveState(next, sess.current); }, []);
  const online = () => sess.current && !sess.current.offline && sess.current.token;

  const endSession = useCallback(() => {
    try{ localStorage.removeItem(LS_SESSION); }catch(e){}
    sess.current = null; dirty.current = false; clearTimeout(pushTimer.current); setSessionState(null);
  }, []);

  const push = useCallback(async () => {
    if(!online()) return;
    setSync('syncing');
    try{
      const r = await api.putState(ref.current);
      write(syncKey(sess.current), r.updatedAt); dirty.current = false; setSync('synced');
    }catch(e){ if(e.status === 401) endSession(); else setSync(e.status === 503 ? 'nodb' : 'offline'); }
  }, [endSession]);
  const schedulePush = useCallback(() => {
    dirty.current = true;
    clearTimeout(pushTimer.current); pushTimer.current = setTimeout(push, 800);
  }, [push]);

  /* 修改狀態：fn 直接改 draft，回傳值會原樣傳回 */
  const update = useCallback(fn => {
    const draft = structuredClone(ref.current);
    const ret = fn(draft);
    replace(draft); schedulePush();
    return ret;
  }, [replace, schedulePush]);

  const setUiKey = useCallback((k, v) => setUi(u => { const n = { ...u, [k]: v }; write(LS_UI, n); return n; }), []);

  const pull = useCallback(async (force) => {
    if(!online() || (dirty.current && !force)) return;
    try{
      const r = await api.getState();
      if(r.state && r.state.v === STATE_VERSION && (force || r.updatedAt > read(syncKey(sess.current), 0))){ replace(rollDaily(r.state)); write(syncKey(sess.current), r.updatedAt); }
      else if(!r.state){ await push(); return; } // 伺服器還沒有這個帳號的資料：把本機的傳上去
      setSync('synced');
    }catch(e){ if(e.status === 401) endSession(); else setSync(e.status === 503 ? 'nodb' : 'offline'); }
  }, [replace, push, endSession]);

  /* 定時同步：有本機修改就上傳，沒有就拉取別台裝置的更新 */
  useEffect(() => {
    const id = setInterval(() => { if(!online()) return; if(dirty.current) push(); else pull(false); }, POLL_MS);
    return () => clearInterval(id);
  }, [push, pull]);

  /* 開始一個工作階段：載入這個帳號在本機的資料，連得上後端就以伺服器的為準 */
  const startSession = useCallback(async next => {
    write(LS_SESSION, next); sess.current = next; setSessionState(next); dirty.current = false;
    const st = loadState(next); ref.current = st; setS(st);
    if(next.offline){ setSync('offline'); return; }
    setSync('syncing'); await pull(true);
  }, [pull]);

  const login = useCallback(async (username, password) => {
    const r = await api.login(username, password);
    await startSession({ username: r.user.username, demo: false, token: r.token });
  }, [startSession]);
  const register = useCallback(async (username, password) => {
    const r = await api.register(username, password);
    await startSession({ username: r.user.username, demo: false, token: r.token });
  }, [startSession]);
  /* 展示帳號：連得上後端就用 admin 帳號（資料會同步），連不上就用離線的展示資料，現場網路不好也能展示 */
  const enterDemo = useCallback(async () => {
    try{ const r = await api.demo(); await startSession({ username: r.user.username, demo: true, token: r.token }); }
    catch(e){ await startSession({ username: 'admin', demo: true, offline: true }); }
  }, [startSession]);
  /* 展示帳號曾因後端未啟動而進入離線模式時，後端恢復後自動重新連線。 */
  useEffect(() => {
    if(!(session && session.demo && session.offline)) return;
    let stop = false;
    const reconnect = () => api.demo().then(r => {
      if(!stop) startSession({ username: r.user.username, demo: true, token: r.token });
    }).catch(() => {});
    reconnect(); const id = setInterval(reconnect, 3000);
    return () => { stop = true; clearInterval(id); };
  }, [session, startSession]);
  const enterOffline = useCallback(() => startSession({ username: '訪客', demo: false, offline: true }), [startSession]);
  const logout = useCallback(async () => {
    if(online()) { try{ await api.logout(); }catch(e){} }
    endSession(); setUi(u => { const n = { ...u, tab: 'home' }; write(LS_UI, n); return n; });
  }, [endSession]);

  const reset = useCallback(() => {
    const me = sess.current, fresh = me && me.demo ? demoState() : seed();
    if(me && me.demo){
      const oldWater = ref.current.tasks.find(t => t.title === '每日喝水');
      const newWater = fresh.tasks.find(t => t.title === '每日喝水');
      if(oldWater?.logs?.some(log => log.img)) Object.assign(newWater, { logs: oldWater.logs, status: oldWater.status, doneOn: oldWater.doneOn, proof: oldWater.proof });
      fresh.proofs = [...fresh.proofs.filter(p => p.task !== '每日喝水'), ...ref.current.proofs.filter(p => p.task === '每日喝水')];
    }
    if(me && !me.demo && !me.offline) fresh.user.name = me.username;
    replace(fresh); schedulePush();
  }, [replace, schedulePush]);

  return <Ctx.Provider value={{ S, update, ui, setUiKey, session, sync, login, register, enterDemo, enterOffline, logout, reset }}>{children}</Ctx.Provider>;
}
