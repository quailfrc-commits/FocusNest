export const pad = n => String(n).padStart(2, '0');
export function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function addDays(s, n){ const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
export function addMonths(s, n){ const d = new Date(s + 'T00:00:00'); d.setDate(1); d.setMonth(d.getMonth() + n); return ymd(d); }
export function monthDays(s){ const d = new Date(s + 'T00:00:00'); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
export function monthLabel(s){ const [y, m] = s.split('-'); return `${+y} 年 ${+m} 月`; }
export function md(s){ const p = s.split('-'); return (+p[1]) + '/' + (+p[2]); }
export function diffDays(a, b){ return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); }
export function uid(){ return Math.random().toString(36).slice(2, 9); }
export function today(){ return ymd(new Date()); }
export function clock(){ const d = new Date(); return d.getHours() + ':' + pad(d.getMinutes()); }
export function fmt(sec){ sec = Math.max(0, Math.ceil(sec)); return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); }
export const WD = ['日', '一', '二', '三', '四', '五', '六'];
