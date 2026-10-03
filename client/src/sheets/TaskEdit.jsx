import React, { useState } from 'react';
import { useApp } from '../ui.jsx';
import { TYPES } from '../lib/data.js';
import { children, estimateMinutes, findTask, isProject, spentMinutes, spreadDates } from '../lib/logic.js';
import { addDays, today, uid } from '../lib/util.js';
import { aiSplit } from '../lib/ai.js';
import { CatPick, DatePick, MinuteStep, QPick, Seg } from './parts.jsx';

/* 任務詳情＝編輯：名稱、類型、分類、象限、日期、番茄數、備註都能改；
   專案還能改子任務（名稱、到期日、番茄數、刪除、新增），也能再用 AI 拆解加入更多子任務。按「儲存」才會生效。 */
export function DetailSheet(){
  const { S, update, sheet, setSheet, toast } = useApp();
  const t = findTask(S, sheet.id);
  const [d, setD] = useState(() => t && {
    title: t.title, criteria: t.criteria || '', type: t.type, q: t.q, start: t.start, due: t.due, minutes: estimateMinutes(t), cat: t.cat || '', note: t.note || '',
    subs: isProject(t) ? children(S, t.id).map(c => ({ id: c.id, title: c.title, criteria: c.criteria || '', minutes: estimateMinutes(c), start: c.start, due: c.due, status: c.status })) : [],
    busy: false, aiNote: '', confirmDel: false
  });
  if(!t || !d) return null;
  const sub = !!t.parent, proj = d.type === 'project' && !sub;
  const set = patch => setD(x => ({ ...x, ...patch }));
  const setSub = (i, patch) => set({ subs: d.subs.map((s, j) => j === i ? { ...s, ...patch } : s) });

  async function split(){
    if(!d.title.trim()){ toast('先輸入任務名稱'); return; }
    set({ busy: true });
    const r = await aiSplit(d.title.trim());
    const end = d.due < d.start ? d.start : d.due; // 新子任務的日期一律排在專案期間內
    const last = d.subs.length ? d.subs[d.subs.length - 1].due : d.start;
    const from = last < d.start ? d.start : last > end ? end : last;
    const dues = spreadDates(from, end, r.list.length).map(x => x > end ? end : x);
    set({ busy: false, subs: [...d.subs, ...r.list.map((x, i) => ({ id: null, title: x.title, criteria: x.criteria || '', minutes: x.minutes || x.est * 25, start: i ? dues[i - 1] : from, due: dues[i], status: 'todo' }))],
      aiNote: r.ai ? 'Gemini 真實回傳 · ' + r.model + ' · 已加入 ' + r.list.length + ' 個子任務' : 'AI 暫時無法使用，先用範本加入 ' + r.list.length + ' 個子任務' });
  }
  function save(){
    const title = d.title.trim();
    if(!title){ toast('請輸入任務名稱'); return; }
    if(isProject(t) && d.type !== 'project' && d.subs.length){ toast('這個專案還有子任務，先刪除子任務才能改類型'); return; }
    const due = d.due < d.start ? d.start : d.due;
    update(S => {
      const x = findTask(S, t.id);
      const minutes = Math.max(1, +d.minutes || 1);
      Object.assign(x, { title, criteria: d.criteria, type: sub ? x.type : d.type, q: d.q, start: d.start, due, estimateMin: proj ? 0 : minutes, est: proj ? 0 : Math.ceil(minutes / 25), cat: d.cat, note: d.note });
      if(!isProject(x)) return;
      const keep = new Set(d.subs.filter(s => s.id).map(s => s.id));
      S.tasks = S.tasks.filter(c => c.parent !== x.id || keep.has(c.id));
      d.subs.forEach(s => {
        const ex = s.id && S.tasks.find(c => c.id === s.id);
        const sstart = s.start < x.start ? x.start : s.start > due ? due : s.start;
        const sdue = s.due < sstart ? sstart : s.due > due ? due : s.due;
        if(ex){
          const minutes = Math.max(1, +s.minutes || 1);
          Object.assign(ex, { title: s.title.trim() || ex.title, criteria: (s.criteria || '').trim(), estimateMin: minutes, est: Math.ceil(minutes / 25), cat: d.cat, start: sstart, due: sdue });
        } else if(s.title.trim()){
          const minutes = Math.max(1, +s.minutes || 1);
          S.tasks.push({ id: uid(), title: s.title.trim(), criteria: (s.criteria || '').trim(), type: 'project', q: x.q, start: sstart, due: sdue, estimateMin: minutes, est: Math.ceil(minutes / 25), pomo: 0, spentMin: 0, status: 'todo', parent: x.id, cat: d.cat });
        }
      });
    });
    setSheet(null); toast('已儲存');
  }
  function del(){
    if(!d.confirmDel){ set({ confirmDel: true }); return; }
    update(S => { S.tasks = S.tasks.filter(x => x.id !== t.id && x.parent !== t.id); });
    setSheet(null); toast('已刪除');
  }

  return <>
    <h2>編輯任務</h2>
    <label className="field">任務名稱<input className="input" value={d.title} onChange={e => set({ title: e.target.value })} autoComplete="off" /></label>
    {!sub && <div className="field">類型<Seg opts={TYPES} value={d.type} onPick={v => set({ type: v })} /></div>}
    <div className="field">分類<CatPick value={d.cat} onPick={v => set({ cat: v })} /></div>
    <div className="field">重要程度<QPick value={d.q} onPick={q => set({ q })} /></div>
    <div className="row2">
      <DatePick label="開始" value={d.start} onChange={start => set({ start })} />
      <DatePick label="到期" value={d.due} onChange={due => set({ due })} />
    </div>
    {!proj && <div className="field">預估時間（分鐘）<MinuteStep value={d.minutes} onChange={minutes => set({ minutes })} /><span className="muted">目前已專注 {spentMinutes(t)} 分鐘</span></div>}
    {!proj && <label className="field">完成條件<input className="input" value={d.criteria} onChange={e => set({ criteria: e.target.value })} placeholder="做到什麼程度才算完成？" /></label>}
    {t.type === 'daily' && <div className="field">每日回顧<button type="button" className="btn ghost" onClick={() => setSheet({ k: 'habitlog', id: t.id })}>📅 查看每日回顧</button></div>}
    {proj && <div className="field">子任務（{d.subs.length}）
      <div className="subedits">{d.subs.map((s, i) => <div className={'subedit' + (s.status === 'done' ? ' done' : '')} key={s.id || 'n' + i}>
        <input className="input" value={s.title} disabled={s.status === 'done'} placeholder="子任務名稱" onChange={e => setSub(i, { title: e.target.value })} />
        <button type="button" className="subdel" aria-label="刪除這個子任務" onClick={() => set({ subs: d.subs.filter((_, j) => j !== i) })}>✕</button>
        <input className="input subcriteria" value={s.criteria || ''} disabled={s.status === 'done'} placeholder="完成條件" onChange={e => setSub(i, { criteria: e.target.value })} />
        <DatePick compact label="開始" value={s.start} onChange={start => setSub(i, { start })} />
        <DatePick compact label="到期" value={s.due} onChange={due => setSub(i, { due })} />
        <MinuteStep compact value={s.minutes} onChange={minutes => setSub(i, { minutes })} />
        {s.status === 'done' && <span className="muted subtag">已完成</span>}
      </div>)}</div>
      <div className="row2">
        <button type="button" className="btn ghost" onClick={() => set({ subs: [...d.subs, { id: null, title: '', criteria: '', minutes: 25, start: d.start, due: d.due, status: 'todo' }] })}>＋ 新增子任務</button>
        <button type="button" className="btn ghost" disabled={d.busy} onClick={split}>{d.busy ? '拆解中…' : '✨ AI 拆解並加入'}</button>
      </div>
      {d.aiNote && <div className="demo-note">{d.aiNote}</div>}
    </div>}
    <label className="field">備註<textarea className="input" rows={3} value={d.note} onChange={e => set({ note: e.target.value })} placeholder="想記下來的細節、連結…" /></label>
    {t.proof && <div className="field">成果驗證照<div className="proofbox"><img src={t.proof} alt="成果照" /></div></div>}
    <div className="row2">
      {!isProject(t) && t.status !== 'done' && <button type="button" className="btn ghost" onClick={() => setSheet({ k: 'prepare', id: t.id })}>專注這個</button>}
      <button type="button" className="btn ghost" style={{ color: 'var(--tomato)' }} onClick={del}>{d.confirmDel ? '再按一次確認' : '刪除'}</button>
    </div>
    <div className="row2"><button type="button" className="btn ghost" onClick={() => setSheet(null)}>取消</button><button type="button" className="btn g" onClick={save}>儲存</button></div>
  </>;
}
