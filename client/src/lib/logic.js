import { ITEMS, NEWBIE_DAYS, DEFAULT_CATS, CAT_COLORS } from './data.js';
import { today, addDays, diffDays, uid } from './util.js';

export const need = S => S.user.name === '展示帳號' && S.user.level === 99 ? 9999 : S.user.level * 100;
export function eff(S){
  const e = { xp: 0, buffer: 0, coin: 0, combo: 1 };
  Object.keys(S.equip.worn).forEach(slot => {
    const it = ITEMS.find(i => i.id === S.equip.worn[slot]); if(!it) return;
    Object.keys(it.eff).forEach(k => { if(k === 'combo') e.combo = it.eff.combo; else e[k] += it.eff[k]; });
  });
  return e;
}
export function dayStat(S, d){
  let n = 0, min = 0, picks = 0;
  S.sessions.forEach(s => { if(s.d === d && s.ok){ n++; min += s.min; } if(s.d === d) picks += s.picks; });
  return { n, min, picks };
}
export function streak(S){
  const T = today();
  let d = dayStat(S, T).n ? T : addDays(T, -1), c = 0;
  while(dayStat(S, d).n > 0){ c++; d = addDays(d, -1); }
  return c;
}
export const findTask = (S, id) => S.tasks.find(t => t.id === id);
export const children = (S, id) => S.tasks.filter(t => t.parent === id);
export const isProject = t => t.type === 'project' && !t.parent;
export const estimateMinutes = t => Math.max(1, +(t.estimateMin || 0) || (+t.est || 1) * 25);
export const spentMinutes = t => Math.max(0, t.spentMin == null ? (+t.pomo || 0) * 25 : +t.spentMin || 0);
export const taskDone = t => t.status === 'done' && (t.type !== 'daily' || t.doneOn === today());
export function projProg(S, p){ const c = children(S, p.id); if(!c.length) return 0; return c.filter(t => t.status === 'done').length / c.length; }
export function projectDone(S, p){ const c = children(S, p.id); return c.length > 0 && c.every(t => t.status === 'done'); }
export function achievements(S){
  const ok = S.sessions.filter(s => s.ok);
  const projDone = S.tasks.some(t => isProject(t) && children(S, t.id).length && projProg(S, t) === 1);
  const days = Object.keys(ok.reduce((a, s) => { a[s.d] = 1; return a; }, {}));
  return [
    ['第一顆番茄', ok.length >= 1, '1'],
    ['零拿起', ok.some(s => !s.demo && s.picks === 0), '0'],
    ['連續 3 天', streak(S) >= 3, '3'],
    ['單日 4 顆', days.some(d => dayStat(S, d).n >= 4), '4'],
    ['驗證 5 次', S.tasks.filter(t => t.proof).length >= 5, '5'],
    ['完成專案', projDone, '★']
  ];
}
export const bufferSecs = S => S.settings.buffer + eff(S).buffer;
export const isNewbie = S => diffDays(S.createdOn || today(), today()) < NEWBIE_DAYS;

/* 會直接修改 S，回傳升級訊息（沒有升級時回傳 null） */
export function addXP(S, n){
  let msg = null;
  S.user.xp += n;
  while(S.user.xp >= need(S)){ S.user.xp -= need(S); S.user.level++; msg = '升級！小鶉現在 Lv ' + S.user.level; }
  if(S.user.xp < 0) S.user.xp = 0;
  return msg;
}
export function spreadSubs(S, parent, subs){
  const span = Math.max(1, diffDays(parent.start, parent.due)), n = subs.length;
  let cur = parent.start;
  subs.forEach((s, i) => {
    const end = addDays(parent.start, Math.round(span * (i + 1) / n));
    const minutes = Math.max(1, +(s.minutes || s.estimateMin || 0) || (+s.est || 1) * 25);
    S.tasks.push({ id: uid(), title: s.title, criteria: s.criteria || '', type: 'project', q: parent.q, start: cur, due: end, estimateMin: minutes, est: Math.ceil(minutes / 25), pomo: 0, spentMin: 0, status: 'todo', parent: parent.id, cat: parent.cat || '' });
    cur = end;
  });
}

/* ---------- AI 失敗時的範本 ---------- */
export function fallbackSplit(title){
  const base = [
    ['確認需求與期限', '列出截止日、必備項目與繳交方式', 1],
    ['蒐集必要資料', '需要引用或使用的資料已集中整理', 1],
    ['完成核心內容', '主要成果已有一份可檢查的完整版本', 3],
    ['檢查並修正成果', '錯字、格式與缺漏都已逐項確認', 2],
    ['完成最後繳交', '成果已依指定方式成功送出', 1]
  ];
  return base.map(b => ({ title: b[0] + '：' + title, criteria: b[1], minutes: b[2] * 25, est: b[2], on: true }));
}
export function doneToday(S){ const T = today(); return S.tasks.filter(t => t.status === 'done' && t.doneOn === T); }
export function diaryFallback(S){
  const st = dayStat(S, today()), done = doneToday(S), tone = S.settings.tone;
  let open;
  if(tone === '毒舌') open = st.n ? '好啦，今天表現還算可以。' : '今天？今天什麼都沒有。我盯著空白的桌子一整天。';
  else if(tone === '幽默') open = st.n ? '鵪鶉觀察日誌，今日天氣：專注晴。' : '鵪鶉觀察日誌，今日天氣：拖延多雲。';
  else open = st.n ? '今天主人有好好陪我！' : '今天主人好像很忙，都沒有把我放到桌上…';
  const lines = [open];
  if(st.n) lines.push('我們一起完成了 ' + st.n + ' 顆番茄，總共 ' + st.min + ' 分鐘。');
  if(st.picks) lines.push('中間主人把我拿起來 ' + st.picks + ' 次，' + (tone === '毒舌' ? '我都有記下來喔。' : '我嚇了一跳。'));
  else if(st.n) lines.push('而且一次都沒有拿起手機，我好驕傲。');
  if(done.length) lines.push('完成的事情：' + done.map(t => t.title).join('、') + '。');
  lines.push(tone === '毒舌' ? '明天別讓我失望。' : tone === '幽默' ? '明日預報：番茄產量看漲。' : '明天也要一起加油喔，晚安。');
  return lines.join('\n');
}

/* 下一個任務：未完成、不是專案外殼，依象限再依到期日排序（手機主頁、電腦版、空白鍵共用） */
export function nextTask(S){
  return S.tasks.filter(t => !taskDone(t) && !isProject(t)).sort((a, b) => a.q - b.q || (a.due < b.due ? -1 : 1))[0];
}

/* 分類：S.cats（舊存檔沒有就用預設）、顏色依在清單裡的順序、把 n 個子任務的到期日平均排在 from～to 之間 */
export const catsOf = S => (S.cats && S.cats.length ? S.cats : DEFAULT_CATS);
export const catColor = (S, name) => { const i = catsOf(S).indexOf(name); return CAT_COLORS[(i < 0 ? CAT_COLORS.length - 1 : i) % CAT_COLORS.length]; };
export function spreadDates(from, to, n){
  const span = Math.max(1, diffDays(from, to));
  return Array.from({ length: n }, (_, i) => addDays(from, Math.round(span * (i + 1) / n)));
}
