import React, { useState } from 'react';
import { useApp, dueTxt } from '../ui.jsx';
import { QUADS } from '../lib/data.js';
import { isProject, projectDone } from '../lib/logic.js';
import { addDays, addMonths, diffDays, monthDays, monthLabel, today } from '../lib/util.js';

export default function Plan(){
  const { S, update, ui, setUiKey, setSheet, toast } = useApp();
  const [dragging, setDragging] = useState(null), [overQ, setOverQ] = useState(null), [monthOffset, setMonthOffset] = useState(0);
  const mode = ui.plan, T = today();
  const head = <div className="seg" role="group">
    <button aria-pressed={mode === 'matrix'} onClick={() => setUiKey('plan', 'matrix')}>艾森豪矩陣</button>
    <button aria-pressed={mode === 'gantt'} onClick={() => setUiKey('plan', 'gantt')}>甘特圖</button>
  </div>;
  const open = S.tasks.filter(t => t.status !== 'done' && !isProject(t));
  const drop = (e, q) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragging;
    const task = S.tasks.find(t => t.id === id);
    if(task && task.q !== q){ update(s => { const x = s.tasks.find(t => t.id === id); if(x) x.q = q; }); toast('已移到「' + QUADS[q][0] + '」'); }
    setDragging(null); setOverQ(null);
  };

  if(mode === 'matrix') return <div className="sec">{head}
    <div className="muted">拖曳任務卡可以換象限，點一下可以編輯。紅色象限的任務會優先排進「下一個任務」。</div>
    <div className="matrix">{[1, 2, 3, 4].map(q => {
      const ts = open.filter(t => t.q === q);
      return <div className={'quad' + (overQ === q ? ' dragover' : '')} key={q} onDragOver={e => { e.preventDefault(); setOverQ(q); }} onDragLeave={() => setOverQ(x => x === q ? null : x)} onDrop={e => drop(e, q)}>
        <h4><i style={{ background: QUADS[q][2] }} />{QUADS[q][0]} <small>{QUADS[q][1]}</small></h4>
        {ts.length ? ts.map(t => <button key={t.id} draggable className={'chipt' + (dragging === t.id ? ' dragging' : '')} style={{ borderLeftColor: QUADS[q][2] }} onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); setDragging(t.id); }} onDragEnd={() => { setDragging(null); setOverQ(null); }} onClick={() => setSheet({ k: 'detail', id: t.id })}>{t.title}<div className="muted" style={{ fontSize: 10.5 }}>{dueTxt(t)}</div></button>)
          : <span className="muted" style={{ fontSize: 11.5 }}>沒有任務</span>}
      </div>;
    })}</div>
  </div>;

  const rows = S.tasks.filter(t => t.type !== 'daily').sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
  const viewStart = addMonths(T, monthOffset), days = monthDays(viewStart), todayIndex = diffDays(viewStart, T);
  return <div className="sec">{head}
    <div className="muted">專案的子任務會排在專案下面，淡色是已完成。</div>
    <div className="month-nav"><button onClick={() => setMonthOffset(x => x - 1)} aria-label="上個月">‹</button><b>{monthLabel(viewStart)}</b><button onClick={() => setMonthOffset(0)}>今天</button><button onClick={() => setMonthOffset(x => x + 1)} aria-label="下個月">›</button></div>
    <div className="card" style={{ padding: 10, minWidth: 0, maxWidth: '100%' }}><div className="gscroll"><div className="gcanvas" style={{ width: 96 + days * 32 }}>
      <div className="ghead"><span /><div className="days" style={{ gridTemplateColumns: `repeat(${days},32px)` }}>{Array.from({ length: days }, (_, i) => <span key={i} className={i === todayIndex ? 't' : undefined}>{i + 1}</span>)}</div></div>
      <div className="gantt">{rows.map(t => {
        const rawS = diffDays(viewStart, t.start), rawE = diffDays(viewStart, t.due), s = Math.max(0, rawS), e = Math.min(days - 1, rawE);
        return <div className="grow" key={t.id}>
          <button className="gn tbody" onClick={() => setSheet({ k: 'detail', id: t.id })} style={t.parent ? { paddingLeft: 10, color: 'var(--soft)' } : { fontWeight: 700 }}>{t.title}</button>
          <div className="gtrack" style={{ '--days': days }}>
            {!(rawE < 0 || rawS >= days) && <span className={'gb q' + t.q + (t.status === 'done' || projectDone(S, t) ? ' done' : '')} style={{ left: (s / days * 100) + '%', width: ((e - s + 1) / days * 100) + '%' }} />}
            {todayIndex >= 0 && todayIndex < days && <span className="today" style={{ left: ((todayIndex + .5) / days * 100) + '%' }} />}
          </div>
        </div>;
      })}</div>
    </div></div></div>
  </div>;
}
