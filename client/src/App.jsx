import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './store.jsx';
import { AppCtx } from './ui.jsx';
import { Pet, Icon } from './Pet.jsx';
import { TONES } from './lib/data.js';
import { dayStat, findTask, need, nextTask } from './lib/logic.js';
import { today } from './lib/util.js';
import { useFocus } from './lib/focus.js';
import { useFlatSensor, useLandscape, usePose, usePickup, IS_TOUCH } from './lib/sensors.js';
import { useLiveSender, useLiveWatch } from './lib/live.js';
import Mirror from './views/Mirror.jsx';
import DemoBall from './DemoBall.jsx';
import Home from './views/Home.jsx';
import Tasks from './views/Tasks.jsx';
import Plan from './views/Plan.jsx';
import Equip from './views/Equip.jsx';
import Group from './views/Group.jsx';
import Focus from './views/Focus.jsx';
import Sheet from './sheets/Sheet.jsx';
import WideApp from './wide/WideApp.jsx';
import nestImg from './assets/pet-nest.png';
import './wide.css';

const TABS = [['group', '群組', 'group'], ['equip', '裝備', 'tools'], ['home', '主頁', 'home'], ['tasks', '任務', 'task'], ['plan', '規劃', 'gantt']];
const VIEWS = { home: Home, tasks: Tasks, plan: Plan, equip: Equip, group: Group };
const SYNC_TXT = { synced: '已同步', syncing: '同步中…', offline: '離線', nodb: '後端沒有資料庫' };
const DEMO = new URLSearchParams(location.search).has('demo');
const DESKTOP = import.meta.env.MODE === 'desktop';

/* 視窗寬度 ≥ 1024px 用電腦版面（左側欄），否則用手機版面 */
function useWide(){
  const query = DESKTOP ? '(min-width:760px)' : '(min-width:1024px)';
  const [wide, setWide] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const f = () => setWide(mq.matches);
    f(); mq.addEventListener('change', f); addEventListener('resize', f); // resize 是保險：有些內嵌視窗不會送 change
    return () => { mq.removeEventListener('change', f); removeEventListener('resize', f); };
  }, [query]);
  return wide;
}

export default function App(){
  const store = useStore();
  const { S, update, ui, setUiKey, sync, session } = store;
  const [sheet, setSheet] = useState(null);
  const [toastMsg, setToast] = useState(null);
  const [bannerMsg, setBanner] = useState(null);
  const [petFlash, setPetFlash] = useState(null);
  const [petSay, setPetSay] = useState(null);
  const toastT = useRef(), bannerT = useRef(), flashT = useRef();

  const toast = useCallback(t => { setToast(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2600); }, []);
  const banner = useCallback(t => { setBanner(t); clearTimeout(bannerT.current); bannerT.current = setTimeout(() => setBanner(null), 4500); }, []);
  const flash = useCallback((m, ms = 4000) => { setPetFlash(m); clearTimeout(flashT.current); flashT.current = setTimeout(() => setPetFlash(null), ms); }, []);

  const focus = useFocus({ S, update, toast, flash });
  const F = focus.F;
  const sensor = useFlatSensor();
  const landscape = useLandscape(), pose = usePose();
  const wide = useWide();
  const online = !!(session && session.token && !session.offline);
  const [hideMirror, setHideMirror] = useState(false);
  // 專注中把狀態傳給後端；電腦版（寬版面、自己沒在專注）讀別的裝置的專注狀態來同步顯示
  useLiveSender(F, F && F.taskId ? (findTask(S, F.taskId) || {}).title : '', online);
  const live = useLiveWatch(wide && !F && online);
  useEffect(() => { if(!live) setHideMirror(false); }, [!!live]);

  function mood(){
    if(F && F.picked) return 'alert';
    if(petFlash) return petFlash;
    if(F && F.phase === 'break') return 'happy';
    if(F && F.phase === 'focus') return F.picks > 1 ? 'sad' : 'normal';
    const st = dayStat(S, today()), h = new Date().getHours();
    if(st.n === 0 && h >= 20) return 'sad';
    if(h >= 23 || h < 6) return 'sleep';
    if(st.n >= 2) return 'happy';
    return 'normal';
  }

  const startFocus = useCallback(taskId => { setSheet(null); focus.start(taskId); }, [focus]);
  const pushNote = useCallback(() => {
    const pool = TONES[S.settings.tone][dayStat(S, today()).n ? 'good' : 'idle'];
    banner(pool[Math.floor(Math.random() * pool.length)]);
  }, [S, banner]);

  /* 真實感測器 1：準備畫面開著時平放在桌上就開始專注 */
  const prevFlat = useRef(sensor.flat);
  useEffect(() => {
    if(!sensor.available || prevFlat.current === sensor.flat){ prevFlat.current = sensor.flat; return; }
    prevFlat.current = sensor.flat;
    if(!F && sensor.flat && sheet && sheet.k === 'prepare') startFocus(sheet.id);
  }, [sensor, F, sheet, startFocus]);

  /* 真實感測器 2：手機轉成橫向就開始專注（直拿管理、橫放專注）。
     只在「剛轉過去」那一下觸發，專注結束後還橫著不會又開始；正在打字或開著別的視窗時不會誤觸發。 */
  const prevLand = useRef(landscape);
  useEffect(() => {
    const was = prevLand.current; prevLand.current = landscape;
    if(landscape === was) return;
    if(landscape){
      const a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
      if(!F && !typing && !(sheet && sheet.k !== 'prepare')) startFocus(sheet ? sheet.id : (nextTask(S) || {}).id);
    }
  }, [landscape]);

  /* 真實感測器 3：專注中拿起手機（以專注開始後穩定下來的姿勢為基準） */
  usePickup(!!(F && F.phase === 'focus'), pose, picked => focus.setPicked(picked));

  /* 專注中讓螢幕保持亮著（不然手機會自己關螢幕，倒數就停了） */
  useEffect(() => {
    if(!F || !navigator.wakeLock) return;
    let lock = null, stop = false;
    const get = () => navigator.wakeLock.request('screen').then(l => { if(stop) l.release(); else lock = l; }).catch(() => {});
    const vis = () => { if(document.visibilityState === 'visible') get(); };
    get(); document.addEventListener('visibilitychange', vis);
    return () => { stop = true; document.removeEventListener('visibilitychange', vis); if(lock) lock.release().catch(() => {}); };
  }, [!!F]);

  /* 示範用快捷鍵（電腦版沒有感測器時用） */
  useEffect(() => {
    function onKey(e){
      if(e.target.matches && e.target.matches('input,textarea')) return;
      const k = e.key.toLowerCase();
      if(k === ' '){
        // 空白鍵開始專注（電腦、網頁都能用）；焦點在按鈕上時讓它照常「按下按鈕」
        if(F || e.target.closest?.('button,a,select,[role=button]') || (sheet && sheet.k !== 'prepare')) return;
        e.preventDefault(); startFocus(sheet ? sheet.id : (nextTask(S) || {}).id);
      }
      else if(k === 'r'){ if(F) focus.askQuit(); else startFocus(sheet && sheet.k === 'prepare' ? sheet.id : null); }
      else if(k === 'p' && F && F.phase === 'focus') focus.setPicked(!F.picked);
      else if(k === 'f') focus.ff();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [F, S, sheet, focus, startFocus]);

  const ctx = { ...store, sheet, setSheet, toast, banner, flash, mood, petSay, setPetSay, focus, startFocus, sensor, touch: IS_TOUCH, pushNote };
  const View = VIEWS[ui.tab] || Home;
  const showDemo = DEMO || !sensor.available || S.settings.demoBar || session.demo;
  const canPick = !!(F && F.phase === 'focus' && (!F.overlay || F.overlay.k === 'warn'));

  return (
    <AppCtx.Provider value={ctx}>
      <div className={'screen' + (F ? ' landscape' : '') + (DESKTOP ? ' desktop' : '') + (wide && !F ? ' wide' : '')}>
        {live && !hideMirror && !F && <Mirror live={live} onHide={() => setHideMirror(true)} />}
        {F ? <Focus /> : wide ? <WideApp /> : <>
          <div className="top">
            <div className="ava"><Pet worn={S.equip.worn} /></div>
            <div className="who">
              <b>{S.user.name}</b>
              <small className="mono">Lv {S.user.level} · 經驗 {S.user.xp}/{need(S)} · {SYNC_TXT[sync]}</small>
              <div className="xpbar"><i style={{ width: Math.round(S.user.xp / need(S) * 100) + '%' }} /></div>
            </div>
            <span className="coin" title="代幣"><i /><span className="mono">{S.user.coins}</span></span>
            <button className="iconbtn" onClick={() => setSheet({ k: 'settings' })} aria-label="設定"><Icon name="gear" /></button>
          </div>
          <div className="main"><View /></div>
          <nav className="tabbar">
            {TABS.map(t => <button key={t[0]} className="tb" aria-current={ui.tab === t[0] ? 'page' : undefined} onClick={() => { setUiKey('tab', t[0]); setSheet(null); }}>{t[0] === 'home' ? <img className="nesticon" src={nestImg} alt="" /> : <Icon name={t[2]} />}<span>{t[1]}</span></button>)}
          </nav>
          {ui.tab === 'tasks' && <button className="fab" onClick={() => setSheet({ k: 'add' })} aria-label="新增任務">＋</button>}
          {sheet && <Sheet />}
        </>}
        {toastMsg && <div className="toast">{toastMsg}</div>}
        {bannerMsg && <div className="banner" role="status"><div className="ava"><Pet m={dayStat(S, today()).n ? 'happy' : 'sad'} /></div><div style={{ flex: 1, minWidth: 0 }}><b>專注小窩<small>現在</small></b><p>{bannerMsg}</p></div></div>}
      </div>
      {showDemo && <DemoBall>
        <button onClick={() => F ? focus.askQuit() : startFocus(sheet && sheet.k === 'prepare' ? sheet.id : null)}>{F ? '直拿手機 R' : '橫放手機 R'}</button>
        <button disabled={!canPick} onClick={() => focus.setPicked(!F.picked)}>{F && F.picked ? '放回桌面 P' : '拿起手機 P'}</button>
        <button disabled={!(F && !F.picked && !F.overlay)} onClick={focus.ff}>快轉 F</button>
        {!F && <button onClick={pushNote}>模擬推播</button>}
      </DemoBall>}
    </AppCtx.Provider>
  );
}
