import React, { useState } from 'react';
import { useApp, QDot, CatTag, dueShort } from '../ui.jsx';
import { Icon } from '../Pet.jsx';
import { NestPet } from '../views/shared.jsx';
import { QUADS, TYPES } from '../lib/data.js';
import { achievements, catsOf, children, dayStat, estimateMinutes, isProject, need, nextTask, projectDone, projProg, spentMinutes, spreadSubs, streak } from '../lib/logic.js';
import { addDays, addMonths, diffDays, md, monthDays, monthLabel, today, WD } from '../lib/util.js';
import { aiSplit } from '../lib/ai.js';
import Equip from '../views/Equip.jsx';
import Group from '../views/Group.jsx';
import { SettingsSheet } from '../sheets/Sheet.jsx';

const TAG = { daily: 'd', weekly: 'w', custom: 'c', project: 'p' };
const TYPE_NAME = Object.fromEntries(TYPES);
const timeTxt = t => spentMinutes(t) + '/' + estimateMinutes(t) + ' 分';

/* ---------- 任務表格（像 Notion 資料庫）---------- */
function Row({ t, sub, collapsed, onToggle }){
  const { S, setSheet, toast } = useApp();
  const proj = isProject(t), done = t.status === 'done' || (proj && projectDone(S, t));
  const late = !done && diffDays(today(), t.due) < 0;
  return <tr className={(sub ? 'sub ' : '') + (done ? 'done' : '')}>
    <td className="t">
      {proj && <button className="w-fold" onClick={onToggle} aria-label={collapsed ? '展開子任務' : '收合子任務'} aria-expanded={!collapsed}>{collapsed ? '▸' : '▾'}</button>}
      {proj ? <span className={'w-ck' + (done ? ' on' : '')} style={done ? undefined : { borderStyle: 'dashed' }} aria-label={done ? '專案已完成' : '專案進度'}>{done && <Icon name="check" />}</span>
        : <button className={'w-ck' + (done ? ' on' : '')} aria-label={done ? '已完成' : '完成並驗證'} onClick={() => done ? toast('已驗證完成的任務不能取消') : setSheet({ k: 'proof', id: t.id, img: null })}>{done && <Icon name="check" />}</button>}
      <button className="w-link" style={proj ? { fontWeight: 700 } : undefined} onClick={() => setSheet({ k: 'detail', id: t.id })}>{t.title}</button>
      {t.criteria && <span className="w-criteria">完成條件：{t.criteria}</span>}
      {proj && <><span className="w-bar"><i style={{ width: Math.round(projProg(S, t) * 100) + '%' }} /></span><span className="w-pomo"> {children(S, t.id).filter(x => x.status === 'done').length}/{children(S, t.id).length}</span></>}
      {t.proof && <span className="w-verified">已驗證</span>}
    </td>
    <td>{!sub && <span className={'w-tag ' + TAG[t.type]}>{TYPE_NAME[t.type]}</span>}</td>
    <td>{!sub && <CatTag name={t.cat} />}</td>
    <td><QDot q={t.q} /></td>
    <td className="mono">{md(t.start)}</td>
    <td style={late ? { color: 'var(--tomato)', fontWeight: 600 } : undefined}>{done ? '已完成' : dueShort(t)}</td>
    <td className="w-pomo">{proj ? '' : timeTxt(t)}</td>
    <td>{!proj && !done && (t.type === 'daily'
      ? <button className="w-checkin" onClick={() => setSheet({ k: 'proof', id: t.id, img: null })}>📷 拍照打卡</button>
      : <button className="w-play" onClick={() => setSheet({ k: 'prepare', id: t.id })} aria-label="專注這個任務"><Icon name="play" /></button>)}</td>
  </tr>;
}

function ProjectRows({ t }){
  const { S, update, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const kids = children(S, t.id);
  async function split(){
    setBusy(true);
    const r = await aiSplit(t.title);
    update(S => spreadSubs(S, S.tasks.find(x => x.id === t.id), r.list));
    setBusy(false);
    toast(r.ai ? 'Gemini 真實回傳 · ' + r.model + ' · ' + r.list.length + ' 個小任務' : '已用範本拆成 ' + r.list.length + ' 個小任務');
  }
  return <>
    <Row t={t} collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
    {!collapsed && kids.map(k => <Row key={k.id} t={k} sub />)}
    {!collapsed && !kids.length && <tr className="sub"><td className="t" colSpan="8"><span className="muted">還沒有子任務　</span><button className="w-ai" disabled={busy} onClick={split}>{busy ? '拆解中…' : '✨ AI 拆解'}</button></td></tr>}
  </>;
}

export function WTasks(){
  const { S, ui, setUiKey, setSheet } = useApp();
  const [hideDone, setHideDone] = useState(false);
  const type = ui.wtype || 'all';
  const cat = ui.wcat || '';
  const cats = catsOf(S), hasNone = S.tasks.some(t => !t.parent && !t.cat);
  const list = S.tasks.filter(t => !t.parent && (type === 'all' || t.type === type) && (!cat || (cat === '__none' ? !t.cat : t.cat === cat)) && !(hideDone && (t.status === 'done' || projectDone(S, t))))
    .sort((a, b) => (a.status === 'done' || projectDone(S, a)) - (b.status === 'done' || projectDone(S, b)) || a.q - b.q || (a.due < b.due ? -1 : 1));
  return <div className="w-page wide">
    <h1 className="w-h1">✅ 任務</h1>
    <p className="w-sub">每日任務可直接拍照打卡；其他任務要先完成至少 1 顆番茄，再上傳成果照。</p>
    <div className="w-tabs">{[['all', '全部'], ...TYPES].map(x => <button key={x[0]} className={type === x[0] ? 'on' : ''} onClick={() => setUiKey('wtype', x[0])}>{x[1]}</button>)}</div>
    <div className="w-cats"><span className="lbl">分類</span>{[['', '全部'], ...cats.map(c => [c, c]), ...(hasNone ? [['__none', '未分類']] : [])].map(c => <button key={c[0]} className={'w-chip' + (cat === c[0] ? ' on' : '')} onClick={() => setUiKey('wcat', c[0])}>{c[1]}</button>)}</div>
    <div className="w-toolbar">
      <button className={'w-chip' + (hideDone ? ' on' : '')} onClick={() => setHideDone(v => !v)}>隱藏已完成</button>
      <span className="sp" />
      <button className="w-ai" onClick={() => setSheet({ k: 'add', type: 'project' })}>✨ AI 拆解大任務</button>
      <button className="w-new" onClick={() => setSheet({ k: 'add', type: type === 'all' ? undefined : type })}>＋ 新增</button>
    </div>
    <table className="w-db">
      <thead><tr><th>任務</th><th>類型</th><th>分類</th><th>象限</th><th>開始</th><th>到期</th><th>專注／預估</th><th /></tr></thead>
      <tbody>
        {list.map(t => isProject(t) ? <ProjectRows key={t.id} t={t} /> : <Row key={t.id} t={t} />)}
        <tr className="add"><td colSpan="8"><button className="w-addrow" onClick={() => setSheet({ k: 'add', type: type === 'all' ? undefined : type })}>＋ 新增任務</button></td></tr>
      </tbody>
    </table>
    {!list.length && <div className="empty">這個分類還沒有任務</div>}
  </div>;
}

/* ---------- 主頁 ---------- */
function MiniTable({ rows }){
  const { setSheet, toast } = useApp();
  return <table className="w-db"><tbody>{rows.map(t => {
    const done = t.status === 'done';
    return <tr key={t.id} className={done ? 'done' : ''}>
      <td className="t"><button className={'w-ck' + (done ? ' on' : '')} aria-label="完成並驗證" onClick={() => done ? toast('已驗證完成的任務不能取消') : setSheet({ k: 'proof', id: t.id, img: null })}>{done && <Icon name="check" />}</button>
        <button className="w-link" onClick={() => setSheet({ k: 'detail', id: t.id })}>{t.title}</button></td>
      <td><span className={'w-tag ' + TAG[t.type]}>{TYPE_NAME[t.type]}</span></td>
      <td><QDot q={t.q} /></td>
      <td>{dueShort(t)}</td>
      <td className="w-pomo">{timeTxt(t)}</td>
      <td>{!done && (t.type === 'daily' ? <button className="w-checkin" onClick={() => setSheet({ k: 'proof', id: t.id, img: null })}>📷 拍照打卡</button> : <button className="w-play" onClick={() => setSheet({ k: 'prepare', id: t.id })} aria-label="專注這個任務"><Icon name="play" /></button>)}</td>
    </tr>;
  })}</tbody></table>;
}

export function WHome(){
  const { S, startFocus, setUiKey, setSheet } = useApp();
  const T = today(), st = dayStat(S, T), yst = dayStat(S, addDays(T, -1)), sk = streak(S);
  const open = S.tasks.filter(t => !isProject(t));
  const todayList = open.filter(t => t.due === T);
  const todayOpen = todayList.filter(t => t.status !== 'done');
  const urgent = todayOpen.filter(t => t.q === 1).length;
  const soon = open.filter(t => t.status !== 'done' && t.due > T && t.due <= addDays(T, 3));
  const next = nextTask(S), dn = st.n - yst.n;
  const days = []; let mx = 25;
  for(let i = 6; i >= 0; i--){ const d = addDays(T, -i), s = dayStat(S, d); days.push([d, s.min]); if(s.min > mx) mx = s.min; }
  const ach = achievements(S);
  const go = tab => { setUiKey('tab', tab); };
  return <div className="w-home">
    <section className="w-hero">
      <div className="w-hero-left">
        <h1 className="w-hero-title">讓小鶉陪你待在桌面</h1>
        <button className="w-menu go" onClick={() => startFocus((next || {}).id)}>▶ 開始專注<kbd>空白鍵</kbd></button>
        <button className="w-menu" onClick={() => go('group')}>好友</button>
        <button className="w-menu" onClick={() => setSheet({ k: 'diary' })}>寵物日記</button>
        <button className="w-menu" onClick={() => go('plan')}>時間軸</button>
        <button className="w-menu" onClick={() => go('equip')}>裝備系統</button>
      </div>
      <div className="w-hero-mid">
        <NestPet />
        <div className="w-xpbar" title={'距離升級還差 ' + (need(S) - S.user.xp) + ' 經驗'}><i style={{ width: Math.round(S.user.xp / need(S) * 100) + '%' }} /><span>Lv {S.user.level}　{S.user.xp}/{need(S)}</span></div>
      </div>
    </section>

    <section className="w-panel">
      <h2 className="w-panel-h">今日任務 <small>{todayOpen.length ? '還有 ' + todayOpen.length + ' 件' + (urgent ? '，其中 ' + urgent + ' 件是「重要且緊急」' : '') : '今天沒有待辦，休息一下'}</small></h2>
      {next && <div className="w-next"><span className="lbl">下一個任務</span><b>{next.title}</b><QDot q={next.q} /><span className="w-pomo">{dueShort(next)} · {timeTxt(next)}</span><button className="w-start sm" onClick={() => startFocus(next.id)}>開始專注</button></div>}
      {todayList.length ? <MiniTable rows={todayList} /> : <div className="empty">今天沒有到期的任務</div>}
      <h3 className="w-panel-h2">⏳ 快到期 <small>未來 3 天</small></h3>
      {soon.length ? <MiniTable rows={soon} /> : <div className="empty">未來 3 天沒有到期的任務</div>}
    </section>

    <section className="w-cards">
      <div className="w-panel sm">
        <h3 className="w-panel-h2">今日統計</h3>
        <div className="w-kpis two">
          <div className="w-kpi"><small>今日番茄</small><b>{st.n}</b><em>{dn > 0 ? '比昨天多 ' + dn + ' 顆' : dn < 0 ? '比昨天少 ' + -dn + ' 顆' : '和昨天一樣'}</em></div>
          <div className="w-kpi"><small>專注分鐘</small><b>{st.min}</b><em>約 {(st.min / 60).toFixed(1)} 小時</em></div>
          <div className="w-kpi"><small>連續天數</small><b>{sk}</b><em>{sk >= 3 ? 'Combo 進行中' : '連續 3 天有 Combo'}</em></div>
          <div className="w-kpi"><small>拿起手機</small><b>{st.picks}</b><em>{st.n && !st.picks ? '今天零拿起' : '專注中拿起會扣分'}</em></div>
        </div>
      </div>
      <div className="w-panel sm">
        <h3 className="w-panel-h2">本週專注分鐘</h3>
        <div className="w-chart tall">{days.map(x => <i key={x[0]} className={x[0] === T ? 't' : ''} title={md(x[0]) + '：' + x[1] + ' 分鐘'} style={{ height: Math.max(4, Math.round(x[1] / mx * 100)) + '%' }} />)}</div>
        <div className="w-chart-x">{days.map(x => <span key={x[0]}>{x[0] === T ? '今' : WD[new Date(x[0] + 'T00:00:00').getDay()]}</span>)}</div>
      </div>
      <div className="w-panel sm">
        <h3 className="w-panel-h2">成就 <small>{ach.filter(a => a[1]).length}/6</small></h3>
        <div className="w-badges">{ach.map(a => <span key={a[0]} className={'w-badge' + (a[1] ? ' got' : '')}>{a[0]}</span>)}</div>
      </div>
    </section>
  </div>;
}

/* ---------- 規劃：四象限＋時間軸放在同一頁 ---------- */
export function WPlan(){
  const { S, update, setSheet, toast } = useApp();
    const [dragging, setDragging] = useState(null), [overQ, setOverQ] = useState(null), [monthOffset, setMonthOffset] = useState(0);
  const T = today();
  const open = S.tasks.filter(t => t.status !== 'done' && !isProject(t));
  const rows = S.tasks.filter(t => t.type !== 'daily').sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
    const viewStart = addMonths(T, monthOffset), days = monthDays(viewStart), todayIndex = diffDays(viewStart, T);
  const drop = (e, q) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragging;
    const task = S.tasks.find(t => t.id === id);
    if(task && task.q !== q){ update(s => { const x = s.tasks.find(t => t.id === id); if(x) x.q = q; }); toast('已移到「' + QUADS[q][0] + '」'); }
    setDragging(null); setOverQ(null);
  };
  return <div className="w-page wide">
    <h1 className="w-h1">🗺 規劃</h1>
    <p className="w-sub">上面決定先做什麼，下面看時間怎麼排。拖曳任務卡可以換象限，點一下可以編輯。</p>
    <h2 className="w-h2">艾森豪矩陣</h2>
    <div className="w-matrix">{[1, 2, 3, 4].map(q => <div className={'w-quad' + (overQ === q ? ' dragover' : '')} key={q} onDragOver={e => { e.preventDefault(); setOverQ(q); }} onDragLeave={() => setOverQ(x => x === q ? null : x)} onDrop={e => drop(e, q)}>
      <h4><i style={{ background: QUADS[q][2] }} />{QUADS[q][0]} <small>{QUADS[q][1]}</small></h4>
      {open.filter(t => t.q === q).map(t => <button draggable className={'w-card' + (dragging === t.id ? ' dragging' : '')} key={t.id} onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); setDragging(t.id); }} onDragEnd={() => { setDragging(null); setOverQ(null); }} onClick={() => setSheet({ k: 'detail', id: t.id })}>{t.title}<small>{dueShort(t) === '今天' || dueShort(t) === '明天' ? dueShort(t) + '到期' : dueShort(t) + ' 到期'}</small></button>)}
      {!open.some(t => t.q === q) && <span className="muted" style={{ fontSize: 12 }}>沒有任務</span>}
    </div>)}</div>
      <h2 className="w-h2">時間軸</h2>
      <div className="month-nav"><button onClick={() => setMonthOffset(x => x - 1)} aria-label="上個月">‹</button><b>{monthLabel(viewStart)}</b><button onClick={() => setMonthOffset(0)}>今天</button><button onClick={() => setMonthOffset(x => x + 1)} aria-label="下個月">›</button></div>
    <div className="w-tl"><div className="w-tl-canvas" style={{ width: 220 + days * 34 }}>
        <div className="row head"><div className="n">任務</div><div className="days" style={{ gridTemplateColumns: `repeat(${days},34px)` }}>{Array.from({ length: days }, (_, i) => <span key={i} className={i === todayIndex ? 't' : ''}>{i + 1}</span>)}</div></div>
      {rows.map(t => {
          const rawS = diffDays(viewStart, t.start), rawE = diffDays(viewStart, t.due), s = Math.max(0, rawS), e = Math.min(days - 1, rawE);
        return <div className="row" key={t.id}>
          <button className="n" style={t.parent ? { paddingLeft: 22, color: 'var(--soft)' } : { fontWeight: 600 }} onClick={() => setSheet({ k: 'detail', id: t.id })}>{t.title}</button>
            <div className="track" style={{ '--days': days }}>{todayIndex >= 0 && todayIndex < days && <span className="today" style={{ left: ((todayIndex + .5) / days * 100) + '%' }} />}
              {!(rawE < 0 || rawS >= days) && <span className={'b' + (t.status === 'done' || projectDone(S, t) ? ' done' : '')} style={{ left: (s / days * 100) + '%', width: ((e - s + 1) / days * 100) + '%', background: QUADS[t.q][2] }} />}
          </div>
        </div>;
      })}
    </div></div>
  </div>;
}

/* 裝備、群組：沿用手機版內容，只是放進文件式頁面 */
export const WEquip = () => <div className="w-page"><h1 className="w-h1">🎒 裝備</h1><p className="w-sub">用番茄換來的代幣買裝備，穿上就有加成。</p><Equip /></div>;
export const WGroup = () => <div className="w-page"><h1 className="w-h1">👥 群組</h1><p className="w-sub">社交功能規劃中，目前是示範資料。</p><Group /></div>;
export const WSettings = () => <div className="w-page"><div className="w-settings"><SettingsSheet /></div></div>;
