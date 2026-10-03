import React, { useState } from 'react';
import { useApp } from '../ui.jsx';
import { MOODTXT, TAPLINES } from '../lib/data.js';
import { Pet } from '../Pet.jsx';
import { dayStat, diaryFallback, doneToday, streak } from '../lib/logic.js';
import { md, today } from '../lib/util.js';
import { api } from '../lib/api.js';

/* 手機主頁和電腦右側面板共用：小鶉的心情、對話泡泡、摸摸頭 */
export function usePetTalk(){
  const { S, mood, petSay, setPetSay, flash } = useApp();
  const st = dayStat(S, today()), m = mood();
  let bubble;
  if(petSay) bubble = petSay;
  else if(m === 'sad') bubble = st.n ? '剛剛被拿起來好幾次…' : '今天都沒有陪我…';
  else if(m === 'happy') bubble = '今天已經 ' + st.n + ' 顆番茄了！';
  else if(m === 'sleep') bubble = '好晚了，早點睡吧';
  else bubble = st.n ? '再一顆就好，我陪你' : '把手機橫放，我們開始吧';
  function tap(){
    setPetSay(TAPLINES[Math.floor(Math.random() * TAPLINES.length)]);
    setTimeout(() => setPetSay(null), 3000); flash('happy', 2500);
  }
  return { m, bubble, tap, saying: !!petSay };
}

/* 電腦版主頁的鵪鶉（像素風、坐在窩裡）：會動（依心情換動作）、點一下才冒出雲朵對話框（3 秒） */
const MOOD_EMOJI = { normal: '🙂', happy: '😄', sad: '😢', alert: '😱', sleep: '😴' };
export function NestPet(){
  const { S } = useApp();
  const { m, bubble, tap, saying } = usePetTalk();
  return <div className="w-nest">
    {saying && <div className="cloud"><span className="emoji" title={MOODTXT[m]}>{MOOD_EMOJI[m]}</span>{bubble}</div>}
    <button className="nestimg" onClick={tap} aria-label="摸摸小鶉"><Pet m={m} worn={S.equip.worn} /></button>
  </div>;
}

/* 寵物日記：先問後端（Gemini），失敗就用範本。variant：card＝手機卡片，rail＝電腦右側面板 */
export function DiaryCard({ variant = 'card' }){
  const { S, update, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const T = today(), diary = S.diary[T];
  async function makeDiary(){
    const st = dayStat(S, T);
    setBusy(true); toast('小鶉正在寫日記…');
    let entry;
    try{
      const r = await api.diary({ petName: S.pet.name, tone: S.settings.tone, n: st.n, min: st.min, picks: st.picks, streak: streak(S), done: doneToday(S).map(t => t.title) });
      entry = { text: String(r.text || '').trim(), ai: true, model: r.model, receivedAt: r.receivedAt };
      if(!entry.text) throw new Error('empty');
    }catch(e){ entry = { text: diaryFallback(S), ai: false }; toast('AI 暫時無法使用，先用範本寫'); }
    update(S => { S.diary[T] = entry; });
    setBusy(false);
  }
  const body = diary ? <>
    <p className="diary">{diary.text}</p>
    <div className="row2"><button className="btn ghost" disabled={busy} onClick={makeDiary}>重寫一篇</button></div>
    <div className="demo-note" style={{ marginTop: 6 }}>{diary.ai ? 'Gemini 真實回傳 · ' + diary.model + (diary.receivedAt ? ' · ' + new Date(diary.receivedAt).toLocaleTimeString('zh-TW') : '') : '依今天的數據用範本產生'}</div>
  </> : <>
    <p className="muted" style={{ margin: '8px 0 10px' }}>每天晚上，小鶉會依照你的專注時數、拿起次數和完成的任務寫一篇日記。</p>
    <button className="btn g" style={{ width: '100%' }} disabled={busy} onClick={makeDiary}>{busy ? '寫日記中…' : '寫今天的日記'}</button>
  </>;
  if(variant === 'rail') return <div className="w-diary"><h5>小鶉的日記 · {md(T)} <small>{S.settings.tone}語氣</small></h5>{body}</div>;
  return <div className="card">
    <div className="h" style={{ margin: 0 }}><h3 className="kai" style={{ fontSize: 17 }}>小鶉的日記 · {md(T)}</h3><small>{S.settings.tone}語氣</small></div>
    {body}
  </div>;
}
