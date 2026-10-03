import React, { useEffect, useRef, useState } from 'react';
import { useApp, QDot } from '../ui.jsx';
import { Pet } from '../Pet.jsx';
import nestImg from '../assets/pet-nest.png';
import { FOCUS_LABEL, QUADS, TYPES } from '../lib/data.js';
import { addXP, dayStat, eff, estimateMinutes, findTask, isProject, projProg, spentMinutes, spreadSubs } from '../lib/logic.js';
import { addDays, addMonths, clock, md, monthDays, monthLabel, pad, today, uid } from '../lib/util.js';
import { aiSplit } from '../lib/ai.js';
import { getServer, setServer } from '../lib/api.js';
import { demoState } from '../lib/data.js';
import { DiaryCard } from '../views/shared.jsx';
import { CatPick, DatePick, MinuteStep, QPick, Seg } from './parts.jsx';
import { DetailSheet } from './TaskEdit.jsx';

function AddSheet(){
  const { update, ui, setUiKey, sheet, setSheet, toast } = useApp();
  const T = today(), type0 = sheet.type || ui.ttype;
  const [d, setD] = useState({ title: '', type: type0, q: 2, start: T, due: addDays(T, type0 === 'weekly' ? 6 : type0 === 'daily' ? 0 : 3), minutes: 25, cat: '', subs: [], busy: false, note: '' });
  const set = patch => setD(x => ({ ...x, ...patch }));
  const input = useRef();
  useEffect(() => { input.current && input.current.focus(); }, []);
  async function split(){
    if(!d.title.trim()){ toast('先輸入大任務的名稱'); return; }
    set({ busy: true });
    const r = await aiSplit(d.title.trim());
    set({ busy: false, subs: r.list, note: r.ai ? 'Gemini 真實回傳 · ' + r.model + ' · ' + new Date(r.receivedAt).toLocaleTimeString('zh-TW') : 'AI 暫時無法使用，先用範本拆解' });
  }
  function save(){
    if(!d.title.trim()){ toast('請輸入任務名稱'); return; }
    const due = d.due < d.start ? d.start : d.due;
    const minutes = Math.max(1, +d.minutes || 1);
    const nt = { id: uid(), title: d.title.trim(), type: d.type, q: d.q, start: d.start, due, estimateMin: d.type === 'project' ? 0 : minutes, est: d.type === 'project' ? 0 : Math.ceil(minutes / 25), pomo: 0, spentMin: 0, status: 'todo', parent: null, cat: d.cat };
    update(S => { S.tasks.push(nt); if(d.type === 'project') spreadSubs(S, nt, d.subs.filter(s => s.on && s.title.trim())); });
    setUiKey('ttype', d.type); setSheet(null); toast('已新增「' + nt.title + '」');
  }
  const setSub = (i, patch) => set({ subs: d.subs.map((s, j) => j === i ? { ...s, ...patch } : s) });
  return <>
    <h2>新增任務</h2>
    <label className="field">任務名稱<input ref={input} className="input" value={d.title} onChange={e => set({ title: e.target.value })} onKeyDown={e => { if(e.key === 'Enter'){ e.preventDefault(); save(); } }} placeholder="例如：完成期末專題報告" autoComplete="off" /></label>
    <div className="field">類型<Seg opts={TYPES} value={d.type} onPick={v => set({ type: v })} /></div>
    <div className="field">分類<CatPick value={d.cat} onPick={v => set({ cat: v })} /></div>
    <div className="field">點一下象限，決定重要程度<QPick value={d.q} onPick={q => set({ q })} /></div>
    <div className="row2">
      <DatePick label="開始" value={d.start} onChange={start => set({ start })} />
      <DatePick label="到期" value={d.due} onChange={due => set({ due })} />
    </div>
    {d.type !== 'project'
      ? <div className="field">預估時間（分鐘）<MinuteStep value={d.minutes} onChange={minutes => set({ minutes })} /></div>
      : <div className="field">子任務
          {d.subs.length > 0 && <div className="subs">{d.subs.map((s, i) => <div className="subdraft" key={i}>
            <input type="checkbox" checked={s.on} onChange={e => setSub(i, { on: e.target.checked })} />
            <div><input type="text" value={s.title} aria-label="子任務名稱" onChange={e => setSub(i, { title: e.target.value })} />
              <input type="text" value={s.criteria || ''} aria-label="完成條件" placeholder="完成條件" onChange={e => setSub(i, { criteria: e.target.value })} /></div>
            <span className="mono muted">{s.minutes || s.est * 25} 分</span></div>)}</div>}
          <button className="btn ghost" disabled={d.busy} onClick={split}>{d.busy ? '拆解中…' : 'AI 一句話拆解成小任務'}</button>
          {d.note && <div className="demo-note">{d.note}</div>}
        </div>}
    <div className="row2"><button className="btn ghost" onClick={() => setSheet(null)}>取消</button><button className="btn g" onClick={save}>新增</button></div>
  </>;
}

/* 成果照：裁切成 480×360，疊上小鶉和時間戳（沿用原型 processPhoto） */
function processPhoto(file, title, done, fail, stampDate = today()){
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const W = 480, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'), r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r;
      g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      const pet = new Image();
      pet.onload = () => {
        g.imageSmoothingEnabled = false;
        g.drawImage(pet, W - 168, H - 176, 156, 137);
        g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, H - 34, W, 34);
        g.fillStyle = '#fff'; g.font = '600 14px "Noto Sans TC", sans-serif';
        const d = new Date(), [yy, mm, dd] = stampDate.split('-');
        g.fillText(title.slice(0, 18) + '　' + (+yy) + '/' + (+mm) + '/' + (+dd) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()), 12, H - 12);
        done(c.toDataURL('image/jpeg', .72));
      };
      pet.src = nestImg;
    };
    img.onerror = fail;
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function ProofSheet(){
  const { S, update, sheet, setSheet, toast, flash } = useApp();
  const tp = findTask(S, sheet.id); if(!tp) return null;
  const needsFocus = tp.type !== 'daily', okPomo = !needsFocus || tp.pomo >= 1, img = sheet.img;
  function onFile(e){
    const f = e.target.files && e.target.files[0]; if(!f) return;
    processPhoto(f, tp.title, url => setSheet(s => s && { ...s, img: url }), () => toast('這個檔案無法讀取，請換一張圖片'));
  }
  function submit(){
    const bx = update(S => {
      const t = findTask(S, tp.id);
      t.status = 'done'; t.proof = img; t.doneOn = today();
      if(t.type === 'daily'){
        t.logs ||= [];
        const log = t.logs.find(x => x.date === t.doneOn), entry = { id: log?.id || 'h' + uid(), date: t.doneOn, img, when: clock() };
        if(log) Object.assign(log, entry); else t.logs.push(entry);
      }
      S.proofs.push({ id: 'p' + uid(), img, task: t.title, when: clock() });
      if(S.proofs.length > 6) S.proofs.shift();
      const bx = Math.round(50 * (1 + eff(S).xp)); addXP(S, bx); S.user.coins += 10;
      return bx;
    });
    setSheet(null); flash('happy', 5000); toast('驗證完成！經驗 +' + bx + '、代幣 +10');
  }
  return <>
    <h2>成果驗證</h2>
    <div className="muted">「{tp.title}」要拍下成果才能完成，例如筆記、程式畫面、讀書進度。小鶉會一起入鏡，照片會蓋上時間戳記。{!needsFocus && '每日任務可以直接拍照打卡，不必先開番茄鐘。'}</div>
    {tp.criteria && <div className="card" style={{ marginTop: 10 }}><b>完成條件</b><div className="muted">{tp.criteria}</div></div>}
    <ul className="rules">
      {needsFocus && <li className={okPomo ? 'ok' : 'no'}>{okPomo ? '✓' : '✗'} 已完成 {tp.pomo} 個番茄鐘（至少 1 個）</li>}
      <li className={img ? 'ok' : 'no'}>{img ? '✓' : '✗'} 成果照片</li>
    </ul>
    <div className="proofbox">{img ? <img src={img} alt="成果照預覽" /> : <label htmlFor="fPhoto"><b>拍照或選一張照片</b><span>手機會開相機，電腦可以選圖片檔</span></label>}</div>
    <input type="file" id="fPhoto" accept="image/*" capture="environment" hidden onChange={onFile} />
    {img && <label htmlFor="fPhoto" className="btn ghost" style={{ textAlign: 'center' }}>換一張</label>}
    <div className="row2"><button className="btn ghost" onClick={() => setSheet(null)}>之後再說</button><button className="btn g" disabled={!(okPomo && img)} onClick={submit}>送出驗證</button></div>
  </>;
}

function PrepareSheet(){
  const { S, sheet, startFocus, sensor, touch } = useApp();
  const tt = findTask(S, sheet.id); if(!tt) return null;
  return <>
    <h2>準備專注</h2>
    <div className="card next"><div className="t"><small className="muted">這次要做</small><b>{tt.title}</b><div className="tmeta"><QDot q={tt.q} /><span className="mono">已專注 {spentMinutes(tt)}／預估 {estimateMinutes(tt)} 分</span></div></div></div>
    <div style={{ display: 'grid', justifyItems: 'center', gap: 8, padding: '6px 0' }}>
      <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true"><rect x="40" y="6" width="36" height="64" rx="7" fill="none" stroke="#2A2522" strokeWidth="3" opacity=".35" /><path d="M84 34 q18 4 16 22" fill="none" stroke="#2F6F5E" strokeWidth="3" strokeLinecap="round" /><path d="M96 52 l4 6 5 -6" fill="none" stroke="#2F6F5E" strokeWidth="3" strokeLinecap="round" /><rect x="8" y="50" width="64" height="26" rx="6" fill="none" stroke="#2A2522" strokeWidth="3" /></svg>
      <div className="muted" style={{ textAlign: 'center' }}>
        {sensor.available || touch ? <>把手機轉成<b>橫向</b>（或<b>平放</b>在桌上）就會自動開始 {FOCUS_LABEL[S.settings.focus]}的番茄鐘。<br />專注中拿起手機，小鶉會發現喔。</>
          : <>這台裝置沒有動作感測器，按下面的按鈕開始 {FOCUS_LABEL[S.settings.focus]}的番茄鐘。</>}
      </div>
    </div>
    <button className="btn g" onClick={() => startFocus(tt.id)}>{sensor.available ? '直接開始' : '開始專注'}</button>
  </>;
}

function HabitLogSheet(){
  const { S, update, session, sheet, setSheet, toast } = useApp();
  const t = findTask(S, sheet.id); if(!t) return null;
  const [monthOffset, setMonthOffset] = useState(0), [selected, setSelected] = useState(null), [busy, setBusy] = useState(false);
  const start = addMonths(today(), monthOffset), days = monthDays(start), lead = new Date(start + 'T00:00:00').getDay();
  const byDate = Object.fromEntries((t.logs || []).map(x => [x.date, x]));
  const picked = selected && byDate[selected];
  function backfill(e){
    const file = e.target.files && e.target.files[0]; if(!file || !selected || !session.demo) return;
    setBusy(true);
    processPhoto(file, t.title, img => {
      update(S => {
        const task = findTask(S, t.id); task.logs ||= [];
        const log = task.logs.find(x => x.date === selected), entry = { id: log?.id || 'h' + uid(), date: selected, img, when: clock() };
        if(log) Object.assign(log, entry); else task.logs.push(entry);
        if(selected === today()){
          task.status = 'done'; task.doneOn = selected; task.proof = img;
          const proof = [...S.proofs].reverse().find(x => x.task === task.title);
          if(proof) Object.assign(proof, { img, when: entry.when }); else S.proofs.push({ id: 'p' + uid(), img, task: task.title, when: entry.when });
        }
      });
      setBusy(false); toast('已補上 ' + selected.replaceAll('-', '/') + ' 的照片');
    }, () => { setBusy(false); toast('這個檔案無法讀取，請換一張圖片'); }, selected);
    e.target.value = '';
  }
  return <>
    <h2>{t.title}的每日回顧</h2>
    <div className="muted">點選日期後，會在月曆下方放大當天的照片。</div>
    <div className="month-nav"><button type="button" onClick={() => { setMonthOffset(x => x - 1); setSelected(null); }} aria-label="上個月">‹</button><b>{monthLabel(start)}</b><button type="button" onClick={() => { setMonthOffset(0); setSelected(null); }}>今天</button><button type="button" onClick={() => { setMonthOffset(x => x + 1); setSelected(null); }} aria-label="下個月">›</button></div>
    <div className="habit-calendar"><div className="habit-week">{['日','一','二','三','四','五','六'].map(x => <b key={x}>{x}</b>)}</div><div className="habit-month">{Array.from({ length: lead }, (_, i) => <span key={'b'+i} />)}{Array.from({ length: days }, (_, i) => {
      const date = addDays(start, i), log = byDate[date];
      return <button type="button" key={date} className={(selected === date ? 'on ' : '') + (log?.img ? 'has-photo' : log ? 'pending' : '')} onClick={() => setSelected(date)}><b>{i + 1}</b>{log?.img ? <img src={log.img} alt="" /> : <small>{log ? '待補' : ''}</small>}</button>;
    })}</div></div>
    {selected && <div className="habit-preview">{picked?.img ? <img src={picked.img} alt={selected + ' 成果照'} /> : <div className="habitempty">{picked ? '這天的照片待補' : '這天沒有打卡紀錄'}</div>}<b>{selected.replaceAll('-', '/')}</b>{picked?.when && <small>{picked.when}</small>}{session.demo && selected <= today() && <><label htmlFor="habitBackfill" className="btn ghost" style={{ textAlign: 'center' }}>{busy ? '處理照片中…' : picked?.img ? '更換這天照片' : '補上這天照片'}</label><input id="habitBackfill" type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={backfill} /></>}</div>}
    <button type="button" className="btn g" onClick={() => setSheet({ k: 'detail', id: t.id })}>回到任務</button>
  </>;
}

export function SettingsSheet(){
  const { S, update, session, sync, logout, reset, setSheet, toast, pushNote } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [server, setServerInput] = useState(getServer());
  const s = S.settings, st = dayStat(S, today());
  const set = (k, v) => update(S => { S.settings[k] = v; });
  return <>
    <h2>設定</h2>
    <div className="field">推播語氣<Seg opts={[['撒嬌', '撒嬌'], ['毒舌', '毒舌'], ['幽默', '幽默']]} value={s.tone} onPick={v => set('tone', v)} /></div>
    <div className="field">番茄鐘長度<Seg opts={[['25', '25 分'], ['50', '50 分'], ['demo', '示範 10 秒']]} value={s.focus} onPick={v => set('focus', v)} /></div>
    <div className="field">休息長度<Seg opts={[['5', '5 分'], ['10', '10 分'], ['demo', '示範 5 秒']]} value={s.rest} onPick={v => set('rest', v)} /></div>
    <div className="field">拿起手機的警告緩衝<Seg opts={[[3, '3 秒'], [5, '5 秒']]} value={s.buffer} onPick={v => set('buffer', +v)} />
      <span className="muted" style={{ fontWeight: 400 }}>緩衝內放回不扣分，避免碰到桌子就被誤判。裝備可以再加秒數。前 3 天是新手保護期，拿起只會讓小鶉失落、不扣經驗。</span></div>
    <div className="field">示範按鈕<Seg opts={[['auto', '自動'], ['on', '一直顯示']]} value={s.demoBar ? 'on' : 'auto'} onPick={v => set('demoBar', v === 'on')} />
      <span className="muted" style={{ fontWeight: 400 }}>自動：沒有動作感測器時才顯示一顆可以拖曳的「示範」小球。模擬器或展示時可以改成一直顯示。</span></div>
    <div className="field">帳號
      <div className="card" style={{ display: 'grid', gap: 8, fontWeight: 400 }}>
        <div>目前帳號：<b>{session.username}</b>{session.demo && '（展示帳號）'}{session.offline && '（離線，只存在這台裝置）'}</div>
        <div>同步狀態：{{ synced: '已同步，換裝置登入同一個帳號就會看到', syncing: '同步中…', offline: session.offline ? '離線使用，不會同步' : '連不到後端（資料先存在這台裝置）', nodb: '後端沒有連上資料庫' }[sync]}</div>
        <button className="btn ghost" onClick={() => { setSheet(null); logout(); }}>登出</button>
        <label className="field" style={{ fontWeight: 400 }}>伺服器位址（網頁版留空；手機 App 和電腦 App 填電腦的區網位址）
          <div className="row2"><input className="input" value={server} onChange={e => setServerInput(e.target.value)} placeholder="http://SERVER_IP:3000" /><button className="btn ghost" style={{ flex: '0 0 auto' }} onClick={() => { setServer(server); location.reload(); }}>儲存</button></div>
        </label>
      </div>
    </div>
    {session.demo && <div className="field">展示工具
      <div className="card" style={{ display: 'grid', gap: 8, fontWeight: 400 }}>
        <div className="muted">展示帳號專用：現場展示時用來補資料。</div>
        <div className="row2">
          <button className="btn g" onClick={() => { update(S => {
            const oldWater = S.tasks.find(t => t.title === '每日喝水');
            const waterProofs = S.proofs.filter(p => p.task === '每日喝水');
            const next = demoState(), newWater = next.tasks.find(t => t.title === '每日喝水');
            if(oldWater?.logs?.some(log => log.img)) Object.assign(newWater, { logs: oldWater.logs, status: oldWater.status, doneOn: oldWater.doneOn, proof: oldWater.proof });
            next.proofs = [...next.proofs.filter(p => p.task !== '每日喝水'), ...waterProofs];
            Object.assign(S, next);
          }); toast('已填入展示資料'); }}>一鍵填入展示資料</button>
          <button className="btn ghost" onClick={() => { update(S => { S.user.coins += 10000; }); toast('代幣 +10,000'); }}>＋10,000 代幣</button>
          <button className="btn ghost" onClick={() => { update(S => { S.user.level += 1; S.user.xp = 0; }); toast('升 1 級'); }}>升 1 級</button>
        </div>
      </div>
    </div>}
    <div className="field">桌面小工具（Widget）預覽
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 150, height: 150, borderRadius: 26, background: st.n ? '#E0EDE7' : '#F3E3DE', padding: 12, display: 'grid', gridTemplateRows: '1fr auto', boxShadow: '0 8px 18px -10px rgba(0,0,0,.4)', flex: 'none' }}>
          <div style={{ width: 86, height: 86, margin: '0 auto' }}><Pet m={st.n ? 'happy' : 'sad'} worn={S.equip.worn} /></div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', textAlign: 'center' }}>{st.n ? '今天 ' + st.n + ' 顆番茄' : '主人是不是不要我了？'}</div>
        </div>
        <span className="muted" style={{ fontWeight: 400 }}>規劃中：今天沒有專注時，桌面小工具會換成小鶉難過的樣子。</span>
      </div>
    </div>
    <button className="btn ghost" onClick={pushNote}>模擬一則推播</button>
    <button className="btn ghost" style={{ color: 'var(--tomato)' }} onClick={() => {
      if(!confirmReset){ setConfirmReset(true); return; }
      reset(); setSheet(null); toast('已重置示範資料');
    }}>{confirmReset ? '再按一次確認重置' : '重置示範資料'}</button>
  </>;
}

function DiarySheet(){ return <><h2>寵物日記</h2><DiaryCard variant="rail" /></>; }

const SHEETS = { diary: DiarySheet, add: AddSheet, detail: DetailSheet, proof: ProofSheet, prepare: PrepareSheet, habitlog: HabitLogSheet, settings: SettingsSheet };

export default function Sheet(){
  const { sheet, setSheet } = useApp();
  const Body = SHEETS[sheet.k];
  return <div className="backdrop" onClick={e => { if(e.target === e.currentTarget) setSheet(null); }}>
    <div className="sheet" role="dialog" aria-modal="true"><div className="grab" /><Body /></div>
  </div>;
}
