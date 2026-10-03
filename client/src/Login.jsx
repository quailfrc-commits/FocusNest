import React, { useEffect, useState } from 'react';
import { useStore } from './store.jsx';
import { Pet } from './Pet.jsx';
import { api, getServer, setServer } from './lib/api.js';
import './login.css';

const ERR = {
  wrong_credentials: '帳號或密碼不對',
  username_taken: '這個帳號已經有人用了，換一個試試',
  bad_username: '帳號要 3 到 20 個字，只能用英文、數字、底線和中文',
  bad_password: '密碼至少 6 個字',
  too_many_attempts: '嘗試太多次了，請 10 分鐘後再試'
};
const errText = e => ERR[e.message] || (e.status === 503 ? '伺服器還沒連上資料庫' : '連不到伺服器。請確認電腦的後端有開、手機和電腦在同一個 Wi-Fi；也可以先用展示帳號或離線使用');

/* 登入畫面：帳號＋密碼；展示帳號一鍵進入（不用密碼）；也可以離線使用 */
export default function Login(){
  const { login, register, enterDemo, enterOffline } = useStore();
  const [mode, setMode] = useState('login');
  const [u, setU] = useState(''), [p, setP] = useState(''), [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const [health, setHealth] = useState(undefined); // undefined 檢查中、null 連不到、物件＝已連線
  const [srv, setSrv] = useState(getServer());
  const check = () => { setHealth(undefined); api.health().then(setHealth).catch(() => setHealth(null)); };
  useEffect(check, []);

  async function run(fn){ setBusy(true); setErr(''); try{ await fn(); }catch(e){ setErr(errText(e)); setBusy(false); } }
  function submit(e){
    e.preventDefault();
    if(!u.trim() || !p) return setErr('請輸入帳號和密碼');
    if(mode === 'register'){
      if(p !== p2) return setErr('兩次輸入的密碼不一樣');
      return run(() => register(u.trim(), p));
    }
    run(() => login(u.trim(), p));
  }
  const status = health === undefined ? '檢查伺服器…' : health ? '伺服器已連線' : '連不到伺服器';

  return <div className="lg">
    <div className="lg-box">
      <div className="lg-pet"><Pet m="happy" /></div>
      <h1 className="lg-title">專注小窩</h1>
      <form className="lg-card" onSubmit={submit}>
        <div className="lg-tabs" role="group">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>登入</button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(''); }}>註冊</button>
        </div>
        <label className="lg-field">帳號<input value={u} onChange={e => setU(e.target.value)} autoComplete="username" autoCapitalize="none" placeholder="3 到 20 個字" /></label>
        <label className="lg-field">密碼<input type="password" value={p} onChange={e => setP(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="至少 6 個字" /></label>
        {mode === 'register' && <label className="lg-field">再輸入一次密碼<input type="password" value={p2} onChange={e => setP2(e.target.value)} autoComplete="new-password" /></label>}
        {err && <div className="lg-err" role="alert">{err}</div>}
        <button className="lg-go" disabled={busy}>{busy ? '請稍候…' : mode === 'login' ? '登入' : '建立帳號並登入'}</button>
        <div className="lg-or">或</div>
        <button type="button" className="lg-demo" disabled={busy} onClick={() => run(enterDemo)}>展示帳號 · 一鍵進入<small>不用密碼；高等級、大量代幣、兩週的紀錄</small></button>
        <button type="button" className="lg-link" disabled={busy} onClick={enterOffline}>離線使用（資料只存在這台裝置）</button>
      </form>
      <details className="lg-srv">
        <summary><i className={'dot' + (health ? ' ok' : '')} />{status}</summary>
        <div className="lg-srv-row">
          <input value={srv} onChange={e => setSrv(e.target.value)} placeholder="伺服器位址（網頁版留空；手機 App 填電腦的區網位址，例如 http://SERVER_IP:3000）" />
          <button type="button" onClick={() => { setServer(srv); check(); }}>儲存</button>
        </div>
      </details>
    </div>
  </div>;
}
