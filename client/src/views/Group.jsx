import React from 'react';
import { useApp } from '../ui.jsx';
import { Pet } from '../Pet.jsx';
import { FRIENDS, friendPhoto } from '../lib/data.js';
import { dayStat } from '../lib/logic.js';
import { addDays, today } from '../lib/util.js';

/* 讀書小組：這次不做真的社交，朋友是示範資料（企劃書寫成規劃中） */
export default function Group(){
  const { S, update, mood, toast } = useApp();
  const T = today(), me = dayStat(S, T);
  let wk = 0; for(let i = 0; i < 7; i++) wk += dayStat(S, addDays(T, -i)).min;
  const board = FRIENDS.map(f => ({ n: f.n, min: f.min, me: false })).concat([{ n: S.user.name + '（我）', min: wk, me: true }]).sort((a, b) => b.min - a.min);
  const mx = board[0].min || 1;
  const feed = S.proofs.slice().reverse().map(p => ({ who: S.user.name, img: p.img, t: p.task, when: p.when, id: p.id }))
    .concat([{ who: '小明', img: friendPhoto('code'), t: '資料結構作業 3', when: '40 分鐘前', id: 'f1' }, { who: '小華', img: friendPhoto('note'), t: '微積分筆記第 4 章', when: '2 小時前', id: 'f2' }]);
  return <div className="sec">
    <div className="g-top">
      <div className="card">
        <div className="h" style={{ margin: '0 0 4px' }}><h3>讀書小組：期中衝刺</h3><small>4 人</small></div>
        <div className="mem"><div className="ava"><Pet m={mood()} worn={S.equip.worn} /></div><div className="t"><b>{S.user.name}（我）</b><div className="muted"><span className="dot" style={{ background: me.n ? 'var(--green)' : 'var(--faint)' }} />今天 {me.n} 顆番茄</div></div></div>
        {FRIENDS.map(f => <div className="mem" key={f.n}>
          <div className="ava"><Pet m={f.st === 'idle' ? 'sad' : f.st === 'rest' ? 'happy' : 'normal'} worn={f.w} /></div>
          <div className="t"><b>{f.n}</b><div className="muted"><span className="dot" style={{ background: f.c }} />{f.t}</div></div>
          {f.st === 'idle' && <button className="cheer" onClick={() => toast('已戳一下' + f.n + '，她的小鶉會提醒她開始')}>戳一下</button>}
        </div>)}
        <div className="demo-note">社交功能規劃中，朋友為示範資料</div>
      </div>
      <div className="card">
        <div className="h" style={{ margin: '0 0 6px' }}><h3>本週專注排行</h3><small>分鐘</small></div>
        {board.map((b, i) => <div key={b.n} className={'lb' + (b.me ? ' me' : '')}><span className="mono">{i + 1}</span><b>{b.n}</b><span className="mono">{b.min}</span><div className="bar"><i style={{ width: Math.round(b.min / mx * 100) + '%' }} /></div></div>)}
      </div>
    </div>
    <div className="h"><h3>成果動態</h3><small>完成任務的驗證照</small></div>
    <div className="feeds">{feed.map(f => {
      const on = !!S.cheers[f.id];
      return <div className="feed" key={f.id}><img className="ph" src={f.img} alt={f.who + '的成果照：' + f.t} />
        <div className="fb"><div className="row2"><div><b>{f.who}</b> 完成了「{f.t}」<div className="muted">{f.when}</div></div>
          <button className={'cheer' + (on ? ' on' : '')} onClick={() => update(S => { S.cheers[f.id] = !S.cheers[f.id]; })}>{on ? '已加油' : '加油'}</button></div></div></div>;
    })}</div>
  </div>;
}
