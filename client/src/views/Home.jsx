import React from 'react';
import { useApp, QDot, dueTxt } from '../ui.jsx';
import { Icon } from '../Pet.jsx';
import { NestPet } from './shared.jsx';
import { achievements, dayStat, estimateMinutes, need, nextTask, spentMinutes, streak } from '../lib/logic.js';
import { addDays, md, today, WD } from '../lib/util.js';

/* 手機主頁：跟電腦版同一套元素（標題、像素鵪鶉、經驗條、橘色選單），排成一直欄 */
export default function Home(){
  const { S, setSheet, setUiKey, startFocus } = useApp();
  const T = today(), st = dayStat(S, T), sk = streak(S);
  const next = nextTask(S);
  const days = []; let mx = 25;
  for(let i = 6; i >= 0; i--){ const d = addDays(T, -i), s = dayStat(S, d); days.push([d, s.min]); if(s.min > mx) mx = s.min; }
  const hasDemo = S.sessions.some(s => s.demo);
  const ach = achievements(S);
  const go = tab => () => setUiKey('tab', tab);

  return <div className="sec">
    <section className="m-hero">
      <h1 className="m-title">讓小鶉陪你待在桌面</h1>
      <NestPet />
      <div className="w-xpbar" title={'距離升級還差 ' + (need(S) - S.user.xp) + ' 經驗'}><i style={{ width: Math.round(S.user.xp / need(S) * 100) + '%' }} /><span>Lv {S.user.level}　{S.user.xp}/{need(S)}</span></div>
    </section>
    <div className="m-menu">
      <button className="w-menu go" onClick={() => next ? setSheet({ k: 'prepare', id: next.id }) : startFocus()}>▶ 開始專注</button>
      <button className="w-menu" onClick={go('group')}>好友</button>
      <button className="w-menu" onClick={() => setSheet({ k: 'diary' })}>寵物日記</button>
      <button className="w-menu" onClick={go('plan')}>時間軸</button>
      <button className="w-menu" onClick={go('equip')}>裝備系統</button>
    </div>
    <div className="stats">
      <div className="stat"><b>{st.n}</b><small>今日番茄</small></div>
      <div className="stat"><b>{st.min}</b><small>專注分鐘</small></div>
      <div className="stat"><b>{sk}</b><small>連續天數</small></div>
    </div>
    {next && <div className="card next">
      <div className="t"><small className="muted">下一個任務</small><b>{next.title}</b>
        <div className="tmeta"><QDot q={next.q} /><span>{dueTxt(next)}</span><span className="mono">{spentMinutes(next)}/{estimateMinutes(next)} 分</span></div></div>
      <button className="play" onClick={() => setSheet({ k: 'prepare', id: next.id })} aria-label="開始專注"><Icon name="play" /></button>
    </div>}
    <div className="card">
      <div className="h" style={{ margin: '0 0 6px' }}><h3>本週專注分鐘</h3><small>{hasDemo ? '前幾天為示範資料' : ''}</small></div>
      <div className="chart">{days.map(x => <div key={x[0]} className={'c' + (x[0] === T ? ' today' : '')} title={md(x[0]) + '：' + x[1] + ' 分鐘'}><span>{x[1] || ''}</span><i style={{ height: Math.round(x[1] / mx * 100) + '%' }} /></div>)}</div>
      <div className="chart-x">{days.map(x => <span key={x[0]}>{x[0] === T ? '今天' : WD[new Date(x[0] + 'T00:00:00').getDay()]}</span>)}</div>
    </div>
    <div className="h"><h3>Combo 成就</h3><small>{ach.filter(a => a[1]).length}/6</small></div>
    <div className="badges">{ach.map(a => <div key={a[0]} className={'badge' + (a[1] ? ' got' : '')}><div className="md">{a[2]}</div>{a[0]}</div>)}</div>
  </div>;
}
