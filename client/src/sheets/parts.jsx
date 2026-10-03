import React, { useRef, useState } from 'react';
import { useApp } from '../ui.jsx';
import { QUADS, DEFAULT_CATS } from '../lib/data.js';
import { catsOf } from '../lib/logic.js';

/* 對話框裡共用的小元件 */
export function QPick({ value, onPick }){
  return <div className="qpick">{[1, 2, 3, 4].map(q => <button key={q} type="button" aria-pressed={value === q} onClick={() => onPick(q)}><b style={{ color: QUADS[q][2] }}>{QUADS[q][0]}</b>{QUADS[q][1]}</button>)}</div>;
}
export function Seg({ opts, value, onPick }){
  return <div className="seg">{opts.map(o => <button key={o[0]} type="button" aria-pressed={String(value) === String(o[0])} onClick={() => onPick(o[0])}>{o[1]}</button>)}</div>;
}
export function DatePick({ label, value, onChange, compact = false }){
  const ref = useRef();
  const open = () => { if(ref.current?.showPicker) ref.current.showPicker(); else ref.current?.focus(); };
  return <label className={compact ? 'subdate datepick' : 'field datepick'}>{label}<span><input ref={ref} className="input" type="date" value={value} onChange={e => e.target.value && onChange(e.target.value)} /><button type="button" aria-label={'開啟' + label + '日曆'} onClick={open}>📅</button></span></label>;
}
export function MinuteStep({ value, onChange, compact = false }){
  const nudge = amount => onChange(Math.max(1, Math.min(1440, (+value || 1) + amount)));
  return <div className={(compact ? 'subminutes ' : '') + 'minstep'}><button type="button" aria-label="減少一分鐘" onClick={() => nudge(-1)}>−</button><input className="input" type="number" min="1" max="1440" value={value} onChange={e => onChange(e.target.value)} /><button type="button" aria-label="增加一分鐘" onClick={() => nudge(1)}>＋</button><span>分</span></div>;
}

/* 分類選擇：無、現有分類、＋ 新分類（新的分類存進 S.cats，之後每個任務都能選） */
export function CatPick({ value, onPick }){
  const { S, update } = useApp();
  const [adding, setAdding] = useState(false), [name, setName] = useState('');
  function add(){
    const n = name.trim().slice(0, 8); if(!n) return;
    update(S => { if(!(S.cats && S.cats.length)) S.cats = [...DEFAULT_CATS]; if(!S.cats.includes(n)) S.cats.push(n); });
    onPick(n); setName(''); setAdding(false);
  }
  return <div className="catpick">
    <button type="button" aria-pressed={!value} onClick={() => onPick('')}>無</button>
    {catsOf(S).map(c => <button type="button" key={c} aria-pressed={value === c} onClick={() => onPick(c)}>{c}</button>)}
    {adding
      ? <span className="catadd"><input value={name} maxLength={8} autoFocus placeholder="分類名稱" onChange={e => setName(e.target.value)} onKeyDown={e => { if(e.key === 'Enter'){ e.preventDefault(); add(); } }} /><button type="button" onClick={add}>加入</button></span>
      : <button type="button" className="plus" onClick={() => setAdding(true)}>＋ 新分類</button>}
  </div>;
}
