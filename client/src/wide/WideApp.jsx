import React from 'react';
import { useApp } from '../ui.jsx';
import { Icon } from '../Pet.jsx';
import { need, nextTask } from '../lib/logic.js';
import { WEquip, WGroup, WHome, WPlan, WSettings, WTasks } from './pages.jsx';
import nestImg from '../assets/pet-nest.png';
import Sheet from '../sheets/Sheet.jsx';

/* 電腦版外框：頂部一排分頁（黃底、白色分頁列），內容在下面。設定也是一個分頁。 */
const TABS = [['home', '小鶉的窩'], ['tasks', '任務'], ['plan', '規劃'], ['equip', '裝備'], ['group', '群組'], ['settings', '設定']];
const PAGES = { home: WHome, tasks: WTasks, plan: WPlan, equip: WEquip, group: WGroup, settings: WSettings };
const SYNC_TXT = { synced: '已同步', syncing: '同步中…', offline: '離線', nodb: '後端沒有資料庫' };

export default function WideApp(){
  const { S, ui, setUiKey, sync, session, sheet, setSheet, startFocus } = useApp();
  const Page = PAGES[ui.tab] || WHome;
  const go = tab => { setUiKey('tab', tab); setSheet(null); };
  return <>
    <div className="w-shell">
      <div className="w-info">
        <button className="chip go" onClick={() => startFocus((nextTask(S) || {}).id)} title="按空白鍵也可以開始"><Icon name="play" />開始專注</button>
        <span className="chip">Lv {S.user.level}　{S.user.xp}/{need(S)}</span>
        <span className="chip">🪙 {S.user.coins}</span>
        <span className="chip"><i className={'dot' + (sync === 'synced' ? '' : ' off')} />{SYNC_TXT[sync]} · <b>{session.username}</b>{session.demo && ' · 展示'}</span>
      </div>
      <nav className="w-toptabs" aria-label="主要分頁">
        {TABS.map(t => <button key={t[0]} className={ui.tab === t[0] ? 'on' : ''} onClick={() => go(t[0])}>{t[0] === 'home' && <img className="nesticon" src={nestImg} alt="" />}{t[1]}</button>)}
      </nav>
      <main className="w-main"><Page /></main>
    </div>
    {sheet && <Sheet />}
  </>;
}
