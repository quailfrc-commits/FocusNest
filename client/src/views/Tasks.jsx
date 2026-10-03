import React, { useState } from 'react';
import { useApp, QDot, CatTag, dueTxt } from '../ui.jsx';
import { Icon } from '../Pet.jsx';
import { TYPES } from '../lib/data.js';
import { catsOf, children, estimateMinutes, isProject, projectDone, projProg, spentMinutes, spreadSubs } from '../lib/logic.js';
import { aiSplit } from '../lib/ai.js';

function TaskRow({ t, sub }){
  const { S, update, setSheet, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const proj = isProject(t), done = t.status === 'done' || (proj && projectDone(S, t));
  async function split(){
    setBusy(true);
    const r = await aiSplit(t.title);
    update(S => spreadSubs(S, S.tasks.find(x => x.id === t.id), r.list));
    setBusy(false);
    toast(r.ai ? 'Gemini 真實回傳 · ' + r.model + ' · ' + r.list.length + ' 個小任務' : '已用範本拆成 ' + r.list.length + ' 個小任務');
  }
  const kids = proj ? children(S, t.id) : [];
  return <>
    <div className={'task' + (sub ? ' sub' : '') + (done ? ' done' : '')}>
      {proj && <button className="fold" onClick={() => setCollapsed(v => !v)} aria-label={collapsed ? '展開子任務' : '收合子任務'} aria-expanded={!collapsed}>{collapsed ? '▸' : '▾'}</button>}
      {proj ? <span className={'ck' + (done ? ' on' : '')} style={done ? undefined : { borderStyle: 'dashed' }} aria-label={done ? '專案已完成' : '專案進度'}>{done && <Icon name="check" />}</span>
        : <button className={'ck' + (done ? ' on' : '')} aria-label={done ? '已完成' : '完成並驗證'}
          onClick={() => done ? toast('已驗證完成的任務不能取消') : setSheet({ k: 'proof', id: t.id, img: null })}>{done && <Icon name="check" />}</button>}
      <button className="tbody" onClick={() => setSheet({ k: 'detail', id: t.id })}>
        <div className="tt">{t.title}</div>
        {t.criteria && <div className="criteria">完成條件：{t.criteria}</div>}
        <div className="tmeta"><CatTag name={t.cat} /><QDot q={t.q} /><span>{done ? '已完成' : dueTxt(t)}</span>{!proj && <span className="mono">{spentMinutes(t)}/{estimateMinutes(t)} 分</span>}{t.proof && <span style={{ color: 'var(--green)' }}>已驗證</span>}</div>
        {proj && <div className="pbar"><i style={{ width: Math.round(projProg(S, t) * 100) + '%' }} /></div>}
      </button>
      {!proj && !done && (t.type === 'daily'
        ? <button className="photo-checkin" onClick={() => setSheet({ k: 'proof', id: t.id, img: null })}>📷<span>打卡</span></button>
        : <button className="mini-play" onClick={() => setSheet({ k: 'prepare', id: t.id })} aria-label="專注這個任務"><Icon name="play" /></button>)}
    </div>
    {!collapsed && kids.map(x => <TaskRow key={x.id} t={x} sub />)}
    {proj && !collapsed && !kids.length && <div className="task sub" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="muted">還沒有子任務</span>
      <button className="aichip" disabled={busy} onClick={split}>{busy ? '拆解中…' : 'AI 拆解'}</button>
    </div>}
  </>;
}

export default function Tasks(){
  const { S, ui, setUiKey } = useApp();
  const type = ui.ttype;
  const cat = ui.cat || '';
  const list = S.tasks.filter(t => t.type === type && !t.parent && (!cat || (cat === '__none' ? !t.cat : t.cat === cat)))
    .sort((a, b) => (a.status === 'done' || projectDone(S, a)) - (b.status === 'done' || projectDone(S, b)) || a.q - b.q || (a.due < b.due ? -1 : 1));
  return <div className="sec">
    <div className="seg" role="group">{TYPES.map(x => <button key={x[0]} aria-pressed={type === x[0]} onClick={() => setUiKey('ttype', x[0])}>{x[1]}</button>)}</div>
    <div className="m-cats">{[['', '全部'], ...catsOf(S).map(c => [c, c]), ['__none', '未分類']].map(c => <button key={c[0]} className={'pill' + (cat === c[0] ? ' on' : '')} onClick={() => setUiKey('cat', c[0])}>{c[1]}</button>)}</div>
    <div className="muted">每日任務可直接拍照打卡；其他任務要先完成至少 1 個番茄鐘，再上傳成果照片。</div>
    {list.length ? list.map(t => <TaskRow key={t.id} t={t} />) : <div className="empty">這裡還沒有任務，按右下角 ＋ 新增</div>}
    <div style={{ height: 60 }} />
  </div>;
}
