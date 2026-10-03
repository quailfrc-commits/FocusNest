import React from 'react';
import { useApp } from '../ui.jsx';
import { Pet } from '../Pet.jsx';
import { REST_LABEL } from '../lib/data.js';
import { bufferSecs, dayStat, findTask, isNewbie } from '../lib/logic.js';
import { fmt, today } from '../lib/util.js';

const DARK_GHOST = { color: '#F3EEE6', borderColor: '#555' };

function Overlay(){
  const { S, update, focus, setSheet, setUiKey } = useApp();
  const F = focus.F, o = F.overlay; if(!o) return null;
  const buf = bufferSecs(S);
  if(o.k === 'warn'){
    const held = (Date.now() - F.pickStart) / 1000, left = buf - held, failIn = buf + 10 - held;
    const newbie = isNewbie(S);
    return <div className="ov red"><div className={'ovc' + (F.penalizedThisPick ? ' shake' : '')}>
      <div className="ovpet"><Pet clean m="alert" worn={S.equip.worn} /></div>
      <h2>你把我拿起來了！</h2>
      <div className="big">{left > 0 ? Math.ceil(left) : newbie ? '！' : '−10'}</div>
      <p>{left > 0 ? buf + ' 秒內放回桌面就不扣分'
        : (newbie ? '新手保護中，這次不扣經驗，但小鶉很失落。' : '已扣 10 經驗。') + '再過 ' + Math.max(0, Math.ceil(failIn)) + ' 秒沒放回，這顆番茄就失敗'}</p>
      <button className="btn" style={{ background: '#fff', color: '#7A140C' }} onClick={() => focus.setPicked(false)}>放回桌面</button>
    </div></div>;
  }
  if(o.k === 'result') return <div className="ov dark"><div className="ovc">
    <div className="ovpet"><Pet clean m="happy" worn={S.equip.worn} /></div>
    <h2>完成一顆番茄！</h2>
    <p>經驗 +{o.xp}　代幣 +{o.coin}{o.picks ? '　（拿起 ' + o.picks + ' 次' + (o.pen ? '，扣 ' + o.pen + ' 經驗' : '') + '）' : '　零拿起，小鶉超開心'}</p>
    <div className="row2">
      <button className="btn g" onClick={focus.toBreak}>休息 {REST_LABEL[S.settings.rest]}</button>
      {o.canProof && <button className="btn" style={{ background: '#F3EEE6', color: '#2A2522' }} onClick={() => {
        const t = findTask(S, F.taskId); focus.end(); setUiKey('tab', 'tasks'); if(t) setUiKey('ttype', t.type); setSheet({ k: 'proof', id: t.id, img: null });
      }}>拍成果照完成任務</button>}
    </div>
    <button className="btn ghost" style={DARK_GHOST} onClick={focus.end}>結束</button>
  </div></div>;
  if(o.k === 'breakEnd') return <div className="ov dark"><div className="ovc">
    <div className="ovpet"><Pet clean worn={S.equip.worn} /></div><h2>休息結束</h2><p>要再來一顆嗎？</p>
    <div className="row2"><button className="btn g" onClick={() => focus.start(F.taskId)}>再專注一顆</button><button className="btn ghost" style={DARK_GHOST} onClick={focus.end}>結束</button></div>
  </div></div>;
  if(o.k === 'fail') return <div className="ov dark"><div className="ovc">
    <div className="ovpet"><Pet clean m="sad" worn={S.equip.worn} /></div><h2>這次專注失敗了</h2>
    <p>手機被拿起超過 {buf + 10} 秒，這顆番茄不算。小鶉有點失落…</p>
    <button className="btn g" onClick={focus.end}>回到主頁</button>
  </div></div>;
  if(o.k === 'quit') return <div className="ov dark"><div className="ovc">
    <div className="ovpet"><Pet clean m="sad" worn={S.equip.worn} /></div><h2>要結束這次專注嗎？</h2>
    <p>還剩 {fmt(F.remain)}，現在結束這顆番茄不算，也拿不到獎勵。</p>
    <div className="row2"><button className="btn g" onClick={focus.stay}>繼續專注</button><button className="btn ghost" style={DARK_GHOST} onClick={focus.quitNow}>結束</button></div>
  </div></div>;
  return null;
}

export default function Focus(){
  const { S, focus, mood } = useApp();
  const F = focus.F, t = F.taskId ? findTask(S, F.taskId) : null, brk = F.phase === 'break';
  const say = brk ? '休息一下，喝口水吧' : F.picks >= 2 ? '你今天一直拿起我…我有點難過' : F.picks === 1 ? '剛剛嚇到我了，這次要專心喔'
    : ['我陪你，手機放著就好', '專心的你最帥了', '我在這裡顧著手機'][Math.floor(F.started / 1000) % 3];
  return <>
    <div className={'focus' + (brk ? ' break' : '')}>
      <div className="ringbox">
        <div className="ring">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="#2A2622" strokeWidth="7" />
            <circle cx="60" cy="60" r="54" fill="none" stroke={brk ? '#7CC7AF' : '#D2553F'} strokeWidth="7" strokeLinecap="round" strokeDasharray="339.3" strokeDashoffset={(339.3 * (1 - F.remain / F.total)).toFixed(1)} /></svg>
          <div className="tm"><b>{fmt(F.remain)}</b><small>{brk ? '休息中' : '專注中'}</small></div>
        </div>
        <div className="ftask">{t ? t.title : '自由專注'}</div>
        <div className="fstat"><span>拿起 <b>{F.picks}</b> 次</span><span>今天 <b>{dayStat(S, today()).n}</b> 顆</span></div>
      </div>
      <div className="fpet"><div className="petwrap"><Pet clean m={mood()} worn={S.equip.worn} /></div><div className="say">{say}</div></div>
      <button className="fhint" style={{ border: 0, background: 'none' }} onClick={focus.askQuit}>結束專注</button>
    </div>
    <Overlay />
  </>;
}
