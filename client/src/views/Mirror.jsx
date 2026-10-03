import React, { useEffect, useState } from 'react';
import { useApp } from '../ui.jsx';
import { Pet } from '../Pet.jsx';
import { liveRemain } from '../lib/live.js';
import { fmt } from '../lib/util.js';

/* 電腦版的「同步畫面」：別的裝置（通常是手機）正在專注時，這裡跟著顯示倒數、拿起次數；
   手機被拿起來，這裡也跳紅色警告。這裡只是看，不會影響手機那一場。 */
export default function Mirror({ live, onHide }){
  const { S } = useApp();
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(v => v + 1), 250); return () => clearInterval(id); }, []);
  const brk = live.phase === 'break', remain = liveRemain(live);
  const m = live.picked ? 'alert' : brk ? 'happy' : live.picks > 1 ? 'sad' : 'normal';
  const done = live.overlay === 'result', quit = live.overlay === 'quit', fail = live.overlay === 'fail';
  const status = live.picked ? '手機被拿起來了！' : done ? '完成一顆番茄！' : fail ? '這次專注失敗了' : quit ? '手機正在詢問要不要結束…' : brk ? '手機休息中' : '手機專注中';
  return <div className={'focus mirror' + (brk ? ' break' : '')}>
    <div className="ringbox">
      <div className="ring">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="#2A2622" strokeWidth="7" />
          <circle cx="60" cy="60" r="54" fill="none" stroke={brk ? '#7CC7AF' : '#D2553F'} strokeWidth="7" strokeLinecap="round" strokeDasharray="339.3" strokeDashoffset={(339.3 * (1 - (live.total ? remain / live.total : 0))).toFixed(1)} /></svg>
        <div className="tm"><b>{fmt(remain)}</b><small>{brk ? '休息中' : '專注中'}</small></div>
      </div>
      <div className="ftask">{live.task || '自由專注'}</div>
      <div className="fstat"><span>拿起 <b>{live.picks}</b> 次</span><span>來自 {live.deviceName || '手機'}</span></div>
    </div>
    <div className="fpet"><div className="petwrap"><Pet clean m={m} worn={S.equip.worn} /></div><div className="say">{status}</div></div>
    {live.picked && <div className="ov red mirror-ov"><div className="ovc"><div className="ovpet"><Pet clean m="alert" worn={S.equip.worn} /></div><h2>手機被拿起來了！</h2><p>請把手機放回桌面</p></div></div>}
    <button className="mirror-hide" onClick={onHide}>隱藏這個畫面</button>
  </div>;
}
