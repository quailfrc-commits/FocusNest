import React, { createContext, useContext } from 'react';
import { QUADS } from './lib/data.js';
import { diffDays, md, today } from './lib/util.js';
import { catColor } from './lib/logic.js';

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export function QDot({ q }){
  return <span className="qd"><i style={{ background: QUADS[q][2] }} />{QUADS[q][0]}</span>;
}
export function dueTxt(t){
  const d = diffDays(today(), t.due);
  return d < 0 ? '逾期 ' + (-d) + ' 天' : d === 0 ? '今天到期' : d === 1 ? '明天到期' : md(t.due) + ' 到期';
}

/* 表格用的短到期日：逾期 2 天／今天／明天／10/2 */
export function dueShort(t){
  const d = diffDays(today(), t.due);
  return d < 0 ? '逾期 ' + (-d) + ' 天' : d === 0 ? '今天' : d === 1 ? '明天' : md(t.due);
}

/* 任務分類標籤（沒有分類就不顯示） */
export function CatTag({ name }){
  const { S } = useApp();
  if(!name) return null;
  const [bg, fg] = catColor(S, name);
  return <span className="cat-tag" style={{ background: bg, color: fg }}>{name}</span>;
}
